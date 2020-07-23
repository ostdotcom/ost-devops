'use strict';

const rootPrefix = '../..'
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Mark server for deployment
 * @class
 */
const MarkAsDeployReady = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

MarkAsDeployReady.prototype = Object.create(ServiceBase.prototype);
MarkAsDeployReady.prototype.constructor = MarkAsDeployReady;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_madr_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_madr_v2');
    }

    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }

    if(!options.ipAddresses || options.ipAddresses.length < 1){
      throw oThis.getError('IP addresses are empty!', 'err_ser_as_madr_v3');
    }

  },

  /**
   * Perform service action
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.ipAddresses - IP addresses
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
      throw oThis.getError(`Error while fetching stack configs info for app: ${options.app}`, 'err_ser_as_madr_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    // Mark as deploy-ready for first time
    let respStatus = await oThis.Helper.appEC2.markDeployReady({
      stackConfigId: scRespData['id'],
      app: options.app,
      ipAddresses: options.ipAddresses
    });

    if(!respStatus){
      throw oThis.getError(`Error in marking deploy-ready for app: ${options.app} with ips: ${options.ipAddresses}`, 'err_ser_as_madr_sp2');
    }

    return true;
  }

};

Object.assign(MarkAsDeployReady.prototype, servicePrototype);

/**
 * Mark server for deployment
 * @module services/app_setup/mark_as_deploy_ready
 */
module.exports = MarkAsDeployReady;
