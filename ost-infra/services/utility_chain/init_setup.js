'use strict';

const rootPrefix = '../..'
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , AppEC2InstanceModel = require(rootPrefix + '/models/app_ec2_instances')
;

/**
 * Setup utility chain and init with genesis
 * @class
 */
const UCInitSetup = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

UCInitSetup.prototype = Object.create(ServiceBase.prototype);
UCInitSetup.prototype.constructor = UCInitSetup;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_uc_is_v1');
    }

    if(!options.chainId){
      throw oThis.getError('Invalid chainId!', 'err_ser_uc_is_v2');
    }
    if(![oThis.constants.utilityApp].includes(options.app)){
      throw oThis.getError('Invalid app !', 'err_ser_uc_is_v3');
    }
    oThis.infraWorkspacePath = oThis.constants.infraWorkspacePath();
    oThis.genesisFileName = oThis.constants.ucGenesisFileName(options.chainId);
    oThis.enodeFileName=oThis.constants.getEnodeFileName(options.chainId);

  },

  /**
   * Init and setup utility chain nodes
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.chainId - Chain Id
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @param {string} options.app - app name either utility
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    // Get Stack config data
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if(scGetServiceResp.err){
      throw oThis.getError(`Error while fetching stack configs info`, 'err_ser_uc_is_sp1');
    }
    oThis.stackData = scGetServiceResp['data'];

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_uc_is_sp1.1');
    }
    let acRespData = acGetServiceResp['data']
      , opsCommonConfigs = acRespData[oThis.constants.appConfig.opsConfigDataKey]
    ;
    // Get chain addresses
    let addressMap = await oThis.Helper.chainAddress.getUtilityChainAddressMap({
      stackConfigId: oThis.stackData['id'],
      chainId: options.chainId,
      app:options.app
    });

    // Check for Master internal funder address
    if(!addressMap['masterInternalFunderAddress']){
      throw oThis.getError(`Master internal funder address is not found in DB for chain id: ${options.chainId}`, 'err_ser_uc_is_sp2');
    }

    // Check for at least one sealer address
    if(addressMap['sealerAddresses'].length < 1){
      throw oThis.getError(`Sealer addresses not found for chain id: ${options.chainId}`, 'err_ser_uc_is_sp3');
    }

    // Get inventory data for setup
    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: oThis.stackData['id'],
      app: options.app,
      chainId: options.chainId,
      plainText: oThis.stackData['plainText'],
      ipAddresses: options.ipAddresses
    });
    let sealerAddr = inventoryData['primarySealerAddress'];

    if(!sealerAddr){
      throw oThis.getError(`Primary Sealer addresses is not set for chain id: ${options.chainId}`, 'err_ser_uc_is_sp4');
    }

    let templateData = {
      chainId: options.chainId,
      sealerAddress: sealerAddr.replace('0x', ''),
      masterIntFunderAddress: addressMap['masterInternalFunderAddress'].replace('0x', ''),
    };
    Object.assign(templateData,opsCommonConfigs['chains'][options.chainId]['genesis']);



    let stackData = oThis.stackData[oThis.constants.platform.stackDataKey]
      , stackCommonData= oThis.stackData[oThis.constants.platform.commonDataKey]
      , ansibleData = stackCommonData['ansible'] || {}
      ;
    if(!stackCommonData['logsS3Bucket']){
      throw oThis.getError(`no logs bucket present in platform config`, 'err_ser_uc_is_sp6');
    }
    let extraData = {env:oThis.env};
    Object.assign(extraData,templateData);

    // Get App specific configs for setup
    let appSpecificConfigs = oThis.Helper.ansible.getAppSpecificConfigsForSetup({
      stackConfigs:  oThis.stackData,
      app: options.app,
      extraData: extraData
    });
    // Files to create
    let filesData = appSpecificConfigs['filesData'];

    // Extra vars for nagios task
    let extraVars = {};

    let fileOpsObj = new FileOps();
    let fileResp = await fileOpsObj.generateAppSpecificSetupFiles(filesData,oThis.infraWorkspacePath);
    Object.assign(extraVars, fileResp);

    let filesToDelete = [];
    filesToDelete = filesToDelete.concat(Object.values(fileResp));
    // Filter inventory data
   let filteredInventoryData = inventoryData;


    // Generate ansible inventory yaml for app
    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      chainId: options.chainId,
      inventoryData: filteredInventoryData
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml`, 'err_ser_uc_is_sp7');
    }

    let serviceRespData = serviceResp['data'];
    let enodesOutFile = `${oThis.infraWorkspacePath}/${oThis.enodeFileName}_out.txt`;
    let templateParams = {
      application: options.app,
      chain_id: options.chainId,
      task: 'init_setup',
      infra_workspace: oThis.infraWorkspacePath,
      platform: oThis.stack,
      env: oThis.env,
      sub_env: options.subEnv,
      s3_bucket_logs: 's3://'+ stackCommonData['logsS3Bucket'],
      enodes_out_file: enodesOutFile,
      logsDirPath: oThis.constants.logDirPaths(options.app,ansibleData['profileType']),
      nrpePort:stackData['nagios']['nrpePort'],
      monitoring_task: "nagios_client_setup",
    };
    Object.assign(extraVars,templateParams);
    let shellExec = new ShellExecKlass();
    let runResp = shellExec.runUtilityTask(serviceRespData['file'], extraVars, options.ipAddresses);

    if (!runResp) {
      throw oThis.getError(`Error executing utility task`, 'err_ser_uc_is_sp8');
    }
    await fileOpsObj.removeLocalFiles(filesToDelete);
    // Read enodes from text file
    await oThis.populateEnodeData(enodesOutFile,options.app);

    return true;

  },

  populateEnodeData: async function (enodeFile,app) {
    const oThis = this;

    let fileOpsObj = new FileOps();
    let readResp = fileOpsObj.read(enodeFile).split(/\r?\n/);

    let ipAddresses = [];
    for(let i=0;i<readResp.length;i++){

      let line = readResp[i].trim();

      if(line === ''){
        continue;
      }

      let ipAddress = line.split('@')[1].split(':')[0];
      ipAddresses.push(ipAddress);

      // Get App ec2 records by Ip address
      let appEc2InstanceObj = new AppEC2InstanceModel();
      let rowData = (await appEc2InstanceObj.getByAppIdStackConfigIdAndIpAddresses(app, oThis.stackData['id'], ipAddress))[0];

      let appData = JSON.parse(rowData['app_data']);
      appData['enode'] = line;

      appEc2InstanceObj = new AppEC2InstanceModel();
      let updateResp = await appEc2InstanceObj.updateAppDataById(appData, rowData['id']);

    }

  }

};

Object.assign(UCInitSetup.prototype, servicePrototype);

/**
 * Setup utility chain and init with genesis
 * @module services/ansible/utility_chain/UCInitSetup
 */
module.exports = UCInitSetup;
