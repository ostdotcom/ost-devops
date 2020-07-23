'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * remove  Nagios Config
 * @class
 */
const RemoveNagiosConfig = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

RemoveNagiosConfig.prototype = Object.create(ServiceBase.prototype);
RemoveNagiosConfig.prototype.constructor = RemoveNagiosConfig;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!options.targetPlatformId){
      throw oThis.getError('Invalid target platform identifier!', 'err_ser_dnc_v1');
    }

    if(!oThis.constants.envList().includes(options.targetEnv)){
      throw oThis.getError('Invalid target environment!', 'err_ser_dnc_v2');
    }

    if(!oThis.constants.subEnvList().includes(options.targetSubEnv)){
      throw oThis.getError('Invalid target sub-environment!', 'err_ser_dnc_v3');
    }

    if(!oThis.constants.appList().includes(options.targetApp)){
      throw oThis.getError('Invalid target app identifier!', 'err_ser_dnc_v4');
    }

    let initParams = await oThis.getAppInitParams(options.subEnv);
    oThis.shellExec = new ShellExecKlass(initParams);

  },

  /**
   * Deploy app build on app servers
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.targetPlatformId -- Target platform identifier
   * @param {string} options.targetEnv - Target Environment name
   * @param {string} options.targetSubEnv - Target Sub environment name
   * @param {string} options.targetApp - Target Application identifier
   *  @param {string} options.targetChainId -- Target chain id
   *  @param {string} options.force -- Delete all the configs
   *  @param {string} options.serviceAction  --stop or start or restart
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    let stackScGetServiceObj = new PlatformGet(commonParams);
    let stackScGetServiceResp = await stackScGetServiceObj.perform({
      subEnv: oThis.constants.ostInfraSubEnv()
    });

    if(stackScGetServiceResp.err){
      throw oThis.getError(`Error fetching stack configurations`, 'err_ser_n_nrc_sp1');
    }
    let stackScRespData = stackScGetServiceResp['data'];

    let stackInventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: stackScRespData['id'],
      app: oThis.constants.stackApp,
      plainText: stackScRespData['plainText'],
    });

    if (stackInventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Invalid inventory data`, 'err_ser_n_nrc_sp2');
    }

    let filteredInventoryData = await oThis.Helper.appEC2.filterNagiosServer({
      ec2Data: stackInventoryData['ec2Data']
    });

    if (filteredInventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Error getting filteredInventoryData`, 'err_ser_n_nrc_sp3');
    }

    let namePrefix= oThis.constants.getNagiosConfigFileName({
      targetApp: options.targetApp,
      targetChainId: options.targetChainId,
      targetPlatformId: options.targetPlatformId,
      targetEnv: options.targetEnv,
      targetSubEnv: options.targetSubEnv
    });

    // Extra vars for nagios task
    let extraVars = {
      monitoring_task: "remove_client_config",
      pattern: options.force ? '*' : `${namePrefix}*`
    };
    if(options.serviceAction){
      extraVars['service_action'] = oThis.constants.ansibleSystemdState(options.serviceAction);
    }

    // Generate ansible inventory yaml for app
    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: oThis.constants.ostInfraSubEnv(),
      app: oThis.constants.stackApp,
      inventoryData: filteredInventoryData
    });

    if (serviceResp.err) {
      throw oThis.getError(`Error generating ansible inventory yaml`, 'err_ser_n_nrc_sp3');
    }

    let serviceRespData = serviceResp['data'];


    let initParams = await oThis.getAppInitParams(oThis.constants.ostInfraSubEnv())
      , shellExec = new ShellExecKlass(initParams)
    ;

    // Run ansible playbook for monitoring tasks
    let runResp = shellExec.runNagiostasks(serviceRespData['file'], extraVars);
    if (!runResp) {
      throw oThis.getError('Ansible monitoring task failed ', 'err_ser_dnc_sp2');
    }
    return runResp;

  }
};

Object.assign(RemoveNagiosConfig.prototype, servicePrototype);

/**
 * Deploy nagios client
 * @module services/ansible/deploy_nagios_client
 */
module.exports = RemoveNagiosConfig;
