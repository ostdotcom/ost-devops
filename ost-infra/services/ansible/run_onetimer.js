'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Run one timer tasks
 * @class
 */
const RunOneTimerTask = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

RunOneTimerTask.prototype = Object.create(ServiceBase.prototype);
RunOneTimerTask.prototype.constructor = RunOneTimerTask;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_a_rp_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_a_rp_v2');
    }

    if(!options.taskName){
      throw oThis.getError('Task name not defined !', 'err_ser_a_rp_v3');
    }

    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }

    oThis.shellExec = new ShellExecKlass();

  },

  /**
   * Deploy app build on app servers
   * @param {Object} options - Create service parameters
   * @param {string} options.taskName - Run the following task from onetimer playbook
   * @param {string} options.app - env name
   * @param {string} options.subEnv - subEnv name
   * @param {string} options.ipAddresses - comma seperated ips where  the changes are to be applied
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

    if(scGetServiceResp.err || !scGetServiceResp.data){
      throw oThis.getError(`Error while fetching stack configs info`, 'err_ser_rp_sp1');
    }

    let scRespData = scGetServiceResp['data']
      , stackCommonData = scRespData[oThis.constants.platform.commonDataKey]
    ;

    // Generate ansible inventory yaml for app
    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app:  options.app,
      plainText: scRespData['plainText'],
      ipAddresses: options.ipAddresses
    });

    if (inventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Error getting inventorydata`, 'err_ser_rp_sp2');
    }

    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app:  options.app,
      inventoryData: inventoryData
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml`, 'err_ser_rp_sp3');
    }

    let serviceRespData = serviceResp['data'];

    let extraVars = {
      application: options.app,
      task_name: options.taskName,
      domain: stackCommonData['domain'],
      serviceName: '',
      serviceAction: 'restart',
      forceRestart: true
    };

    let runResp = await oThis.shellExec.runOnetimer(serviceRespData['file'], extraVars, {
      stack: oThis.stack,
      env: oThis.env,
      ips: options.ipAddresses
    });

    if(!runResp){
      throw oThis.getError(`Error running onetimer task for app: ${options.app}, taskName: ${options.taskName}`, 'err_ser_rp_sp4');
    }

    return runResp;
  },

};

Object.assign(RunOneTimerTask.prototype, servicePrototype);

/**
 * Run one timer task
 * @module services/ansible/run_onetimer
 */
module.exports = RunOneTimerTask;
