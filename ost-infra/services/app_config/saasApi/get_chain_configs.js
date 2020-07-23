'use strict';

const rootPrefix = '../../..'
  , StackConfigsModel = require(rootPrefix + '/models/stack_configs')
  , AppConfigsModel = require(rootPrefix + '/models/app_configs')
  , CipherSlatsModel = require(rootPrefix + '/models/cipher_salts')
  , KMSDecryptData = require(rootPrefix + '/lib/aws/kms/decrypt')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * App Chain Config Get for global and aux chains
 * @class
 */
const ChainConfigGet = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

ChainConfigGet.prototype = Object.create(ServiceBase.prototype);
ChainConfigGet.prototype.constructor = ChainConfigGet;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(options.app !== oThis.constants.saasApiApp){
      throw oThis.getError('Invalid application identifier!', 'err_ser_ac_sa_gac_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_ac_sa_gac_v2');
    }

    if(!options.chainId){
      throw oThis.getError('Invalid chain id!', 'err_ser_ac_sa_gac_v3');
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

    // Check if entry already exists
    let scModelObj = new StackConfigsModel();
    let scResp = (await scModelObj.getByStackIdEnvSubEnv(oThis.stack, oThis.env, options.subEnv))[0];

    if(!scResp){
      throw oThis.getError(`Stack does not exists for app: ${options.app}`, 'err_ser_ac_sa_ggc_sp1');
    }

    // Get DB entry
    let acModelObj = new AppConfigsModel();
    let acModelResp = (await acModelObj.getByAppIdStackConfigId(options.app, scResp['id']))[0];

    if(!acModelResp){
      throw oThis.getError(`App configs data does not exists for app: ${options.app}`, 'err_ser_ac_sa_ggc_sp2');
    }

    // Get cipher salts for app config
    let csModelObj = new CipherSlatsModel();
    let csModelResp = (await csModelObj.getById(acModelResp['cipher_salt_id']))[0];

    if(!csModelResp){
      throw oThis.getError(`Cipher Text does not exists for app: ${options.app}`, 'err_ser_ac_sa_ggc_sp3');
    }

    // Decrypt cipher blob
    let initParams = await oThis.getAppInitParams(options.subEnv);
    let kmsObj = new KMSDecryptData(initParams);
    let kmsResp = await kmsObj.perform({
      app: oThis.constants.stackApp,
      cipherTextBlob: csModelResp['kms_cipher_text_blob']
    });

    if(kmsResp['err']){
      throw oThis.getError(`Error decrypting Cipher Text for app: ${options.app}`, 'err_ser_ac_sa_ggc_sp4');
    }


    let kmsData  = kmsResp['data'];

    let opsConfigData = JSON.parse(csModelObj.localCipher.decrypt(kmsData['Plaintext'], acModelResp['enc_ops_config_data']));

    let chainConfigData = {};
    if(parseInt(options.chainId) === 0){
      chainConfigData = opsConfigData['globalConfigs'] || {};
    } else {
      chainConfigData = opsConfigData['auxConfigs'] || {};
    }

    let finalResp = chainConfigData[options.chainId] || {};

    if(options.getInFile){
      return oThis.populateInFile(finalResp, options);
    } else {
      finalResp['app'] = acModelResp['app_id'];
      finalResp['env'] = acModelResp['env'];
      finalResp['subEnv'] = acModelResp['sub_env'];
      finalResp['cipherTextBlob'] = csModelResp['kms_cipher_text_blob'];
      finalResp['plainText'] = kmsData['Plaintext'];
      return finalResp;
    }
  },

  populateInFile: async function (data, options) {
    const oThis = this
    ;

    let fileName = `${oThis.constants.getAppConfigDataFileName(oThis.stack, oThis.env, options.subEnv, options.app)}_${options.chainId}`
      , fileOpsObj = new FileOps();
    let fileOpsResp = await fileOpsObj.create(fileName, data);
    if(fileOpsResp){
      return await fileOpsObj.open(fileName);
    }

    return false;

  }

};

Object.assign(ChainConfigGet.prototype, servicePrototype);

/**
 * Get App global Configs
 * @module services/app_config/saasApi/get_chain_configs
 */
module.exports = ChainConfigGet;