'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
;

/**
 * Deploy nagios client for app
 * @class
 */
const DeployNagiosClient = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

DeployNagiosClient.prototype = Object.create(ServiceBase.prototype);
DeployNagiosClient.prototype.constructor = DeployNagiosClient;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_dnc_v1');
    }
    if(options.app === oThis.constants.utilityApp && !(options.chainId) ){
      throw oThis.getError('ChainId is compulsory for utility app ', 'err_ser_dnc_v2');
    }
    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_dnc_v3');
    }
    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }

    oThis.infraWorkspacePath = oThis.constants.infraWorkspacePath();

    let initParams = await oThis.getAppInitParams(options.subEnv);
    oThis.shellExec = new ShellExecKlass(initParams);

  },

  /**
   * Deploy app build on app servers
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.chainId - chainId
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

    if (scGetServiceResp.err) {
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_dnc_sp1');
    }
    let scRespData = scGetServiceResp['data'];



    let stackData = scRespData[oThis.constants.platform.stackDataKey];
    let extraData = {env:oThis.env,"nagios_client_setup":true};
    // Get App specific configs for setup
    let appSpecificConfigs = oThis.Helper.ansible.getAppSpecificConfigsForSetup({
      stackConfigs: scRespData,
      app: options.app,
      extraData: extraData
    });
    // Files to create
    let filesData = appSpecificConfigs['filesData'];

    // Extra vars for nagios task
    let extraVars = {
      monitoring_task: "nagios_client_setup",
      env: oThis.env,
      app: options.app,
      nrpePort:stackData['nagios']['nrpePort']
    };

    let fileOpsObj = new FileOps();
    let fileResp = await fileOpsObj.generateAppSpecificSetupFiles(filesData,oThis.infraWorkspacePath);
    Object.assign(extraVars, fileResp);

    let filesToDelete = [];
    filesToDelete = filesToDelete.concat(Object.values(fileResp));
    // Generate ansible inventory yaml for app

    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app: options.app,
      plainText: scRespData['plainText'],
      ipAddresses: options.ipAddresses,
      chainId: options.chainId
    });
    if (inventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Error getting inventorydata`, 'err_ser_dnc_sp2');

    }

    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      inventoryData:inventoryData,
      chainId: options.chainId
    });

    if (serviceResp.err) {
      throw oThis.getError(`Error generating ansible inventory yaml for app: ${options.app}`, 'err_ser_dnc_sp5');
    }

    let serviceRespData = serviceResp['data'];


    let initParams = await oThis.getAppInitParams(options.subEnv)
      , shellExec = new ShellExecKlass(initParams)
    ;
// Run ansible playbook for monitoring tasks
    let runResp = shellExec.runNagiostasks(serviceRespData['file'], extraVars);
    if (!runResp) {
      throw oThis.getError('ansible monitoring task failed ', 'err_ser_dnc_sp6');
    }
    await fileOpsObj.removeLocalFiles(filesToDelete);

    return runResp;

  }
};

Object.assign(DeployNagiosClient.prototype, servicePrototype);

/**
 * Deploy nagios client
 * @module services/ansible/deploy_nagios_client
 */
module.exports = DeployNagiosClient;
