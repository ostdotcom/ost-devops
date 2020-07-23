'use strict';

const rootPrefix = '../../..'
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , ChainAddressHelper = require(rootPrefix + '/helpers/chain_address')
;

/**
 * Get Chain addresses
 * @class
 */
const ChainAddressesGet = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

ChainAddressesGet.prototype = Object.create(ServiceBase.prototype);
ChainAddressesGet.prototype.constructor = ChainAddressesGet;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    console.log("options: ", options);

    if(options.app !== oThis.constants.utilityApp){
      throw oThis.getError('Invalid application identifier!', 'err_ser_ac_sa_gca_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_ac_sa_gca_v2');
    }

    if(!options.chainId){
      throw oThis.getError('Invalid chain id!', 'err_ser_ac_sa_gca_v3');
    }

  },

  /**
   * Get Service
   * @constructor
   * @param {Object} options - Get-service optional parameters
   * @param {string} options.app - Application identifier
   * @param {string} options.subEnv - Sub environment name
   * @param {boolean} options.getInFile - Whether to write app config data to file or not
   * @param {boolean} options.chainId - Chain id
   * @returns {Object} App Config data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    options = options || {};

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
      throw oThis.getError(`Error while fetching stack configs info`, 'err_ser_uc_is_sp1');
    }
    let stackData = scGetServiceResp['data'];

    // Get DB entries for chain addresses
    let allAddrKinds = oThis.constants.dbConstants.addressKinds;
    let cAddrHelperObj = new ChainAddressHelper();
    let chainAddressMap = await cAddrHelperObj.getAddressesByChainId({
      kinds: Object.values(allAddrKinds),
      stackConfigId: stackData['id'],
      chainId: options.chainId,
      plainText: stackData['plainText'],
      app:options.app
    });

    console.log("chainAddressMap => ", JSON.stringify(chainAddressMap, null, 4));

    return chainAddressMap;

  },

};

Object.assign(ChainAddressesGet.prototype, servicePrototype);

/**
 * Get Chain addresses
 * @module services/app_config/saasApi/get_chain_addresses
 */
module.exports = ChainAddressesGet;
