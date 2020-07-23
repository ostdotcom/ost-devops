'use strict';

const rootPrefix = '../..'
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ChainAddressesModel = require(rootPrefix + '/models/chain_addresses')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Setup Chain addresses for utility chain
 * @class
 */
const UCSetChainAddress = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

UCSetChainAddress.prototype = Object.create(ServiceBase.prototype);
UCSetChainAddress.prototype.constructor = UCSetChainAddress;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_uc_sca_v1');
    }

    if(!options.chainId){
      throw oThis.getError('Invalid chainId!', 'err_ser_uc_sca_v2');
    }

    if(!options.address){
      throw oThis.getError('Invalid address!', 'err_ser_uc_sca_v3');
    }
    if(!options.app){
      throw oThis.getError('Invalid app!', 'err_ser_uc_sca_v3.1');
    }
    let addressKinds = Object.keys(new ChainAddressesModel().enums);
    if(!addressKinds.includes(options.addressKind)){
      throw oThis.getError('Invalid addressKind!', 'err_ser_uc_sca_v4');
    }

    oThis.infraWorkspacePath = oThis.constants.infraWorkspacePath();
    oThis.genesisFileName = oThis.constants.ucGenesisFileName(options.chainId)

  },

  /**
   * Setup app via ansible
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.chainId - Chain Id
   * @param {string} options.addressKind - Chain Address type (master internal funder or sealer, st admin/owner etc)
   * @param {string} options.address - Chain address for kind
   * @param {string} options.privateKey - Private key for address
   * @param {string} options.app - Chain address for kind
   * @param {string} options.password - Password to unlock key file
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
      throw oThis.getError(`Error while fetching stack configs info`, 'err_ser_uc_is_sp1');
    }
    oThis.stackData = scGetServiceResp['data'];

    // Get chain addresses
    let addressMap = await oThis.Helper.chainAddress.getUtilityChainAddressMap({
      stackConfigId: oThis.stackData['id'],
      chainId: options.chainId,
      app:options.app
    });

    oThis.verifyAddress({
      options: options,
      addressData: addressMap
    });

    let resp = await oThis.createChainAddress(options);

    return resp;

  },

  verifyAddress: async function (params) {
    const oThis = this
    ;

    let options = params['options']
      , addressData = params['addressData']
    ;

    // Validate Master internal funder address
    if(options.addressKind === oThis.constants.dbConstants.addressKinds.masterIntFunderKind){

      if(addressData['masterInternalFunderAddress']){
        throw oThis.getError(`Master internal funder address is already set for chain: ${options.chainId}`, 'err_ser_uc_sca_va1');
      }

    } else if(options.addressKind === oThis.constants.dbConstants.addressKinds.sealerKind){

      if(addressData['sealerAddresses'].includes(options.address)){
        throw oThis.getError(`This Sealer address is already set for chain: ${options.chainId}`, 'err_ser_uc_sca_va2');
      }

    } else if(options.addressKind === oThis.constants.dbConstants.addressKinds.stAdminKind){

      if(addressData['stAdminAddress']){
        throw oThis.getError(`ST admin address is already set for chain: ${options.chainId}`, 'err_ser_uc_sca_va3');
      }

    } else if(options.addressKind === oThis.constants.dbConstants.addressKinds.stOwnerKind){

      if(addressData['stOwnerAddress']){
        throw oThis.getError(`ST Owner address is already set for chain: ${options.chainId}`, 'err_ser_uc_sca_va4');
      }

    }else if(options.addressKind === oThis.constants.dbConstants.addressKinds.usdcOwnerKind){

      if(addressData['usdcOwnerAddress']){
        throw oThis.getError(`usdc Owner address is already set for chain: ${options.chainId}`, 'err_ser_uc_sca_va4');
      }

    }

  },

  createChainAddress: async function (options) {
    const oThis = this
    ;

    let chainAddrModelObj = new ChainAddressesModel();

    let encAddressData = null
      , addressData = {}
    ;
    if(options.addressKind === oThis.constants.dbConstants.addressKinds.masterIntFunderKind){

    } else if (options.addressKind === oThis.constants.dbConstants.addressKinds.sealerKind){

      addressData[oThis.constants.chainAddressEncData.privateKey] = options.privateKey;
      addressData[oThis.constants.chainAddressEncData.passwordKey] = options.password;

    } else if(options.addressKind === oThis.constants.dbConstants.addressKinds.stAdminKind){

      addressData[oThis.constants.chainAddressEncData.privateKey] = options.privateKey;

    } else if(options.addressKind === oThis.constants.dbConstants.addressKinds.stOwnerKind){

      addressData[oThis.constants.chainAddressEncData.privateKey] = options.privateKey;

    }else if(options.addressKind === oThis.constants.dbConstants.addressKinds.usdcOwnerKind){

      addressData[oThis.constants.chainAddressEncData.privateKey] = options.privateKey;

    }


    if(Object.keys(addressData).length > 0){
      encAddressData = chainAddrModelObj.localCipher.encrypt(oThis.stackData['plainText'], JSON.stringify(addressData));
    }

    // Create entry in DB
    let caModelResp = await chainAddrModelObj.create({
      stackConfigId: oThis.stackData['id'],
      stackId: oThis.stackData['stackId'],
      appId: options.app,
      env: oThis.env,
      subEnv: options.subEnv,
      address: options.address,
      encAddressData: encAddressData,
      addressKind: options.addressKind,
      groupId: options.chainId
    });

    return {id: caModelResp['insertId']};
  }

};

Object.assign(UCSetChainAddress.prototype, servicePrototype);

/**
 * Setup Chain addresses for utility chain
 * @module services/ansible/utility_chain/UCSetChainAddress
 */
module.exports = UCSetChainAddress;
