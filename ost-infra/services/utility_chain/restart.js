'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')


  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')

;

/**
 * Restart  utility chain
 * @class
 */
const Restart = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

Restart.prototype = Object.create(ServiceBase.prototype);
Restart.prototype.constructor = Restart;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;
    oThis.shellExec = new ShellExecKlass();

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_uc_r_v1');
    }

    if(!options.chainId){
      throw oThis.getError('Invalid chainId!', 'err_ser_uc_r_v2');
    }
    if(!options.app){
      throw oThis.getError('Invalid app!', 'err_ser_uc_r_v3');
    }
    if(![oThis.constants.utilityApp].includes(options.app)){
      throw oThis.getError('Invalid app !', 'err_ser_uc_r_v4');
    }
    if(options.enodeAddresses){
      options.enodeAddresses=options.enodeAddresses.split(',').map(str => str.trim());
    }
    oThis.infraWorkspacePath = oThis.constants.infraWorkspacePath();

  },

  /**
   * Restart  - restart utility node
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.chainId - Chain Id
   * @param {string} options.runWithZeroGas - Whether to run chain with zero gas or not
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @param {string} options.app - app id
   * @param {string} options.enodeAddresses - app id
   * @param {boolean} options.genesisInit- true or false
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this;

    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };
    let filesToDelete = [];
    let fileOpsObj = new FileOps();
    let fileVars = {};
    // Get Stack config data
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if(scGetServiceResp.err){
      throw oThis.getError(`Error while fetching stack configs info`, 'err_ser_uc_r_sp1');
    }
    let scRespData = scGetServiceResp['data'];
    // Get App EC2 servers data for inventory generation
    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
        stackConfigId: scRespData['id'],
        app: options.app,
        ipAddresses: options.ipAddresses,
        chainId: options.chainId,
        plainText: scRespData['plainText']

    });

    if(inventoryData.chainEnodes.length < 1){
      throw oThis.getError(`enodes are not present in app_data in DB for application: utility`, 'err_ser_uc_r_sp1.1');
    }


    if(options.genesisInit){

      // Get chain addresses
      let addressMap = await oThis.Helper.chainAddress.getUtilityChainAddressMap({
        stackConfigId: scRespData['id'],
        chainId: options.chainId,
        app:options.app
      });

      // Check for Master internal funder address
      if(!addressMap['masterInternalFunderAddress']){
        throw oThis.getError(`Master internal funder address is not found in DB for chain id: ${options.chainId}`, 'err_ser_uc_r_sp1.2');
      }

      // Check for at least one sealer address
      if(addressMap['sealerAddresses'].length < 1){
        throw oThis.getError(`Sealer addresses not found for chain id: ${options.chainId}`, 'err_ser_uc_r_sp1.3');
      }
      let sealerAddr = inventoryData['primarySealerAddress'];

      // Get app config data
      let acGetServiceObj = new AppConfigGet(commonParams);
      let acGetServiceResp = await acGetServiceObj.perform({
        subEnv: options.subEnv,
        app: options.app
      });

      if(acGetServiceResp.err){
        throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_uc_r_sp1.4');
      }
      let acRespData = acGetServiceResp['data']
        , opsCommonConfigs = acRespData[oThis.constants.appConfig.opsConfigDataKey]
      ;
      let templateData = {
        chainId: options.chainId,
        sealerAddress: sealerAddr.replace('0x', ''),
        masterIntFunderAddress: addressMap['masterInternalFunderAddress'].replace('0x', ''),
      };
      Object.assign(templateData,opsCommonConfigs['chains'][options.chainId]['genesis']);
      if(templateData['constantinopleBlock'] == null || templateData['constantinopleBlock'] == null  || templateData['constantinopleBlock'] == null  ){
        throw oThis.getError(`Error as network upgrade blocks not present in opsconfig`, 'err_ser_uc_r_sp2');
      }
      let extraData = {env:oThis.env};
      Object.assign(extraData,templateData);

      // Get App specific configs for setup
      let appSpecificConfigs = oThis.Helper.ansible.getAppSpecificConfigsForSetup({
        stackConfigs:  scRespData,
        app: options.app,
        extraData: extraData
      });
      // Files to create
      let filesData = appSpecificConfigs['filesData'];
      let fileResp = await fileOpsObj.generateAppSpecificSetupFiles(filesData,oThis.infraWorkspacePath);
      Object.assign(fileVars, fileResp);
      fileVars['insecure_unlock']=true;

      filesToDelete = filesToDelete.concat(Object.values(fileResp));

    }

    let newChainEnodes=[];
    if (options.enodeAddresses){
      newChainEnodes=inventoryData.chainEnodes.concat(options.enodeAddresses);
    }
    // Filter inventory data
    let filteredInventoryData = inventoryData;

    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      chainId: options.chainId,
      inventoryData: filteredInventoryData
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml`, 'err_ser_uc_r_sp3');
    }
    let serviceRespData = serviceResp['data'];


    let enodeFile = oThis.constants.getEnodeFileName(options.chainId);
    let FileOpsObj = new FileOps();
    let enodeFileName = await FileOpsObj.create(enodeFile, newChainEnodes.length>0 ? newChainEnodes : inventoryData.chainEnodes);
    let utilityGasPrice = (options.runWithZeroGas ? 0 : oThis.constants.utilityGasPrice);
    let commonEnvFile = await oThis.generateAppCommonConfigFile(options, {"UTILITY_GAS_PRICE": utilityGasPrice});

    let shellExec = new ShellExecKlass();
    let extraVars = {
      application: options.app,
      task: 'start_utility_node',
      infra_workspace: `${oThis.infraWorkspacePath}`,
      chain_id: options.chainId,
      enodes_input_file: enodeFileName,
      local_common_env_file: commonEnvFile
    };
    Object.assign(extraVars,fileVars);
     let runResp = shellExec.runUtilityTask(serviceRespData['file'], extraVars, options.ipAddresses);
    if (!runResp) {
      throw oThis.getError(`Error executing utility task`, 'err_ser_uc_r_sp4');
    }
    if(options.genesisInit) {
      await fileOpsObj.removeLocalFiles(filesToDelete);
    }
    return runResp;

  },

  /**
   * generateAppCommonConfigFile  -Generate common  env file for utility node
   * @function
   * @returns filename
   */
  generateAppCommonConfigFile: async function (options, data) {
    const oThis = this
    ;

    let commonConfigFileName = oThis.constants.appCommonConfigFileName(options.app, options.chainId)
      , fileOpsObj = new FileOps()
      , bashVars = oThis.convertJsonToBash(data)
    ;

    let resp = await fileOpsObj.createFileForPath(`${oThis.infraWorkspacePath}`, commonConfigFileName, 'sh', bashVars);
    return resp;
  },

};

Object.assign(Restart.prototype, servicePrototype);

/**
 * Restart utility chain services
 * @module services/ansible/utility_chain/chain_restart.js
 */
module.exports = Restart;
