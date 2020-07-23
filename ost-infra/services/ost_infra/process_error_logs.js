'use strict';

const rootPrefix = '../..'
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , ProcessLogs = require(rootPrefix + '/lib/error_logs/process_logs')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Process DB error logs
 * @class
 */
const ProcessErrorLogs = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

ProcessErrorLogs.prototype = Object.create(ServiceBase.prototype);
ProcessErrorLogs.prototype.constructor = ProcessErrorLogs;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_oi_pel_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_oi_pel_v2');
    }

    if(!options.severities){
      throw oThis.getError('Invalid severities!', 'err_ser_oi_pel_v3');
    }

  },

  /**
   * Create Service for app server
   * @constructor
   * @param {Object} options - Service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.severities - Comma separated string (high,medium,low)
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_oi_pel_sp1');
    }

    let acRespData = acGetServiceResp['data']
      , opsConfigData = acRespData[oThis.constants.appConfig.opsConfigDataKey]
    ;

    if(!opsConfigData['pagerDuty'] || !opsConfigData['pepoCampaigns']){
      throw oThis.getError(`Invalid configuration for either pagerDuty or pepoCampaigns`, 'err_ser_oi_pel_sp2');
    }

    let maxTime = new Date().getTime() + 0 * (60*1000)
      , currentTime = 0
    ;

    while(currentTime < maxTime){
      let performerObj = new ProcessLogs(options.severities, opsConfigData['pagerDuty'], opsConfigData['pepoCampaigns']);
      await performerObj.perform();

      await oThis.sleep(5 * 1000);

      currentTime = new Date().getTime();
    }
    console.log(`***** Exiting... [${new Date()}]`);

    return true;
  },

  sleep: async function(ms) {
    console.log('*** Sleeping for ', ms, ' ms');
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

};

Object.assign(ProcessErrorLogs.prototype, servicePrototype);

/**
 * Process DB error logs
 * @module services/ost_infra/process_error_logs
 */
module.exports = ProcessErrorLogs;
