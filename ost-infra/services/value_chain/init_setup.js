'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')

;

/**
 * Setup value chain
 * @class
 */
const VCInitSetup = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

VCInitSetup.prototype = Object.create(ServiceBase.prototype);
VCInitSetup.prototype.constructor = VCInitSetup;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_vc_is_v1');
    }

    if(!options.chainId){
      throw oThis.getError('Invalid chainId!', 'err_ser_vc_is_v2');
    }



  },

  /**
   * Init and setup value chain nodes
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.chainId - Chain Id
   * @param {string} options.ipAddresses - Comma separated machine IPs
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
      throw oThis.getError(`Error while fetching stack configs info`, 'err_ser_vc_is_sp1');
    }
    oThis.stackData = scGetServiceResp['data'];
    let stackCommonData= oThis.stackData[oThis.constants.platform.commonDataKey]
      , ansibleData = stackCommonData['ansible'] || {} ;


    let extraData = {env:oThis.env};
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
    let fileResp = await fileOpsObj.generateAppSpecificSetupFiles(filesData,oThis.constants.infraWorkspacePath());
    Object.assign(extraVars, fileResp);

    let filesToDelete = [];
    filesToDelete = filesToDelete.concat(Object.values(fileResp));

    let inventoryData = await oThis.Helper.appEC2.getAppEC2DataForAppSetup({
      stackConfigId: oThis.stackData['id'],
      app: oThis.constants.valueApp,
      chainId: options.chainId,
      plainText: oThis.stackData['plainText'],
      ipAddresses: options.ipAddresses
    });

    if (inventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Error getting inventorydata`, 'err_ser_vc_is_sp2');

    }
    console.log("*********** ec2Data: ", JSON.stringify(inventoryData['ec2Data'], null, " "));

    // Generate ansible inventory yaml for app
    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: oThis.constants.valueApp,
      chainId: options.chainId,
      inventoryData: inventoryData
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml`, 'err_ser_vc_is_sp3');
    }

    let serviceRespData = serviceResp['data'];
    let stackData = oThis.stackData[oThis.constants.platform.stackDataKey];

    let templateParams = {
      task: 'init_setup',
      application: oThis.constants.valueApp,
      env: oThis.env,
      platform: oThis.stack,
      sub_env: options.subEnv,
      s3_bucket_logs: 's3://'+ stackCommonData['logsS3Bucket'],
      nrpePort:stackData['nagios']['nrpePort'],
      monitoring_task: "nagios_client_setup",
      chainId:options.chainId,
      logsDirPath: oThis.constants.logDirPaths(oThis.constants.valueApp,ansibleData['profileType']),
    };

    Object.assign(extraVars,templateParams);
    let shellExec = new ShellExecKlass();
    let runResp = shellExec.runValueTask(serviceRespData['file'], extraVars, options.ipAddresses);

    // Update app setup status
    let updateResp = await oThis.Helper.appEC2.updateAppEC2AppStatusToSetupDone(inventoryData['ec2Data']);

    // Remove locally generated setup files
    await fileOpsObj.removeLocalFiles(filesToDelete);
    return runResp;

  }

};

Object.assign(VCInitSetup.prototype, servicePrototype);

/**
 * Setup value chain
 * @module services/ansible/value_chain/init_setup
 */
module.exports = VCInitSetup;
