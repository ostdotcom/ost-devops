'use strict';

const rootPrefix = '../..'
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Get App EC2 details data
 * @class
 */
const GetAppEc2Details = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

GetAppEc2Details.prototype = Object.create(ServiceBase.prototype);
GetAppEc2Details.prototype.constructor = GetAppEc2Details;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_gaed_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_gaed_v2');
    }

    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }

  },

  /**
   * Perform service action
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.appStatus - App EC2 app-status to be considered
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
      throw oThis.getError(`Error while fetching stack configs info for app: ${options.app}`, 'err_ser_as_gaed_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    // Get app ec2 data
    let respData = await oThis.Helper.appEC2.getFormattedAppEc2Data({
      stackConfigId: scRespData['id'],
      app: options.app,
      appStatus: options.appStatus,
      ipAddresses: options.ipAddresses
    });

    if(!respData){
      throw oThis.getError(`Error in 'get app ec2 details' for app: ${options.app}`, 'err_ser_as_gaed_sp2');
    }

    return {ec2Instances: respData};
  }

};

Object.assign(GetAppEc2Details.prototype, servicePrototype);

/**
 * Get app ec2 details data
 * @module services/app_setup/get_app_ec2_details
 */
module.exports = GetAppEc2Details;
