'use strict';

const rootPrefix = '../..'
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , GetCoinMarketCapConversion = require(rootPrefix + '/lib/price_points/GetPricePoints')
;

/**
 * Get conversion rate from coinmarketcap.com
 * @class
 */
const GetConversionFromCoinMarketCap = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

GetConversionFromCoinMarketCap.prototype = Object.create(ServiceBase.prototype);
GetConversionFromCoinMarketCap.prototype.constructor = GetConversionFromCoinMarketCap;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_oi_gcfc_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_oi_gcfc_v2');
    }

  },

  /**
   * Build app code for application
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.app - Application identifier
   * @param {string} options.subEnv - Sub environment name
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
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_oi_gcfc_sp1');
    }

    let acRespData = acGetServiceResp['data']
      , opsConfigData = acRespData[oThis.constants.appConfig.opsConfigDataKey]
    ;

    if(!opsConfigData['coinMarketCap']){
      throw oThis.getError(`coinmarketcap config doesn't exists: ${options.app}`, 'err_ser_oi_gcfc_sp2');
    }

    let bucketName = opsConfigData['coinMarketCap']['bucket']
      , filePathPrefix = opsConfigData['coinMarketCap']['filePathPrefix']
      , region = opsConfigData['coinMarketCap']['region']
      , coinMarketCapApiKey = opsConfigData['coinMarketCap']['apiKey']
    ;

    let performObj = new GetCoinMarketCapConversion({
      bucketName: bucketName,
      filePathPrefix: filePathPrefix,
      region: region,
      coinMarketCapApiKey: coinMarketCapApiKey
    });
    let resp = await performObj.perform();

    if(!resp.success){
      console.log('Error fetching coinmarketcap data: ', resp.data.errors);
      throw `Error fetching coinmarketcap data: ${resp.data.errors}`
    }

    if(resp.data.warnings.length > 0){
      console.log('coinmarketcap warnings: ', resp.data.warnings);
      // send alert

      await oThis.registerInfraAlertForHighSeverity({kind: 'infra-cmc-warning', data: resp.data.warnings});
    }

    return true;

  }


};

Object.assign(GetConversionFromCoinMarketCap.prototype, servicePrototype);

/**
 * Get conversion rate from coinmarketcap.com
 * @module services/ost_infra/get_conversion_from_coinmarketcap
 */
module.exports = GetConversionFromCoinMarketCap;
