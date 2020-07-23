'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * ServiceHandling app
 * @class
 */
const ServiceHandling = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

ServiceHandling.prototype = Object.create(ServiceBase.prototype);
ServiceHandling.prototype.constructor = ServiceHandling;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_sh_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_sh_v2');
    }
    oThis.shellExec = new ShellExecKlass();

  },

  /**
   * Restart app services
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.flushOptions - flush options
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @param {string} options.serviceName- service name on which actions is to be performed
   * @param {string} options.serviceAction - servvice handlingaction to be taken restart stop etc
   * @param {string} options.chainId - chainId for utility app
   * @returns {Object}
   */
  servicePerform: async function (options) {
    const oThis = this;

    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    // Get stack config details
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if(scGetServiceResp.err){
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_sh_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app: options.app,
      chainId: options.chainId,
      plainText: scRespData['plainText'],
      ipAddresses: options.ipAddresses
    });
    if (inventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Invalid inventory data for service-handling for app: ${options.app}`, 'err_ser_sh_sp1.1');

    }

    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      inventoryData:inventoryData,
      lightInventory: true
    });
    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml for app: ${options.app}`, 'err_ser_sh_sp1.3');
    }
    let serviceRespData = serviceResp['data'];

    if(typeof options.serviceName !== 'undefined' && options.serviceName.length > 0){
      options.serviceName= options.serviceName
    }
    let extraVars = {
      env: oThis.env,
      application:options.app,
      apply_on_hosts:options.subEnv,
      flushOptions: `\\"${options.flushOptions}\\"`,
      serviceAction: options.serviceAction,
      serviceName: options.serviceName||"",
      forceRestart: (options.force ? options.force : "")
    };

    let runResp = await oThis.shellExec.runRestart(serviceRespData['file'],extraVars,options.ipAddresses);

    if(!runResp){
      throw oThis.getError(`Error while restart for app: ${options.app}`, 'err_ser_sh_sp2');
    }

    return runResp;

  },

};

Object.assign(ServiceHandling.prototype, servicePrototype);

/**
 * ServiceHandling app
 * @module services/ansible/service_handling
 */
module.exports = ServiceHandling;
