'use strict';

const rootPrefix = '..'
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , GetFiatConversions = require(rootPrefix + '/lib/fiat_conversions/GetFiatConversions')
;

/**
 * Get conversion rate from fixer
 * @class
 */
const GetFiatToFiatConversions = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

GetFiatToFiatConversions.prototype = Object.create(ServiceBase.prototype);
GetFiatToFiatConversions.prototype.constructor = GetFiatToFiatConversions;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    //nothing to do here.
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

    // TODO:: This is temporary, once start using infra-db for configs, derive this from ops configs
    let opsConfigData = {};
    opsConfigData['fixer'] = {
      "bucket": "public.ost.com",
      "region": "eu-west-1",
      "filePath": "hgfasgv4567gfachsv7568cvsd6t7i6hga/hfgvh345dfgc66rch.json"
    };

    let performObj = new GetFiatConversions({
      bucketName: opsConfigData['fixer']['bucket'],
      filePath: opsConfigData['fixer']['filePath'],
      region: opsConfigData['fixer']['region'],
      fixerApiKey: oThis.constants.envConstants.FIXER_API_KEY
    });
    let resp = await performObj.perform();

    if(!resp.success){
      console.log('Error fetching fixer data: ', resp.data.errors);
      throw `Error fetching fixer data: ${resp.data.errors}`
    }

    return true;
  }


};

Object.assign(GetFiatToFiatConversions.prototype, servicePrototype);

/**
 * Get conversion rate from fixer
 * @module services/get_fiat_to_fiat_conversions.js
 */
module.exports = GetFiatToFiatConversions;
