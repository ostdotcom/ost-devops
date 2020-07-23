'use strict';

const rootPrefix = '../..'
  , StackConfigsModel = require(rootPrefix + '/models/stack_configs')
  , AppConfigsModel = require(rootPrefix + '/models/app_configs')
  , CipherSlatsModel = require(rootPrefix + '/models/cipher_salts')
  , KMSDecryptData = require(rootPrefix + '/lib/aws/kms/decrypt')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * App Config Get
 * @class
 */
const AppConfigGet = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

AppConfigGet.prototype = Object.create(ServiceBase.prototype);
AppConfigGet.prototype.constructor = AppConfigGet;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_acg_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_acg_v2');
    }
  },

  /**
   * Get Service
   * @constructor
   * @param {Object} options - Get-service optional parameters
   * @param {string} options.app - Application identifier
   * @param {string} options.subEnv - Sub environment name
   * @param {boolean} options.getInFile - Whether to write app config data to file or not
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
      throw oThis.getError(`Stack does not exists for app: ${options.app}`, 'err_ser_acg_sp1');
    }

    // Get DB entry
    let acModelObj = new AppConfigsModel();
    let acModelResp = (await acModelObj.getByAppIdStackConfigId(options.app, scResp['id']))[0];

    if(!acModelResp){
      throw oThis.getError(`App configs data does not exists for app: ${options.app}`, 'err_ser_acg_sp2');
    }

    // Get cipher salts for app config
    let csModelObj = new CipherSlatsModel();
    let csModelResp = (await csModelObj.getById(acModelResp['cipher_salt_id']))[0];

    if(!csModelResp){
      throw oThis.getError(`Cipher Text does not exists for app: ${options.app}`, 'err_ser_acg_sp3');
    }

    // Decrypt cipher blob
    let initParams = await oThis.getAppInitParams(options.subEnv);
    let kmsObj = new KMSDecryptData(initParams);
    let kmsResp = await kmsObj.perform({
      app: oThis.constants.stackApp,
      cipherTextBlob: csModelResp['kms_cipher_text_blob']
    });

    if(kmsResp['err']){
      throw oThis.getError(`Error decrypting Cipher Text for app: ${options.app}`, 'err_ser_acg_sp4');
    }


    let kmsData  = kmsResp['data'];
    let finalResp = {
      commonConfigData: JSON.parse(csModelObj.localCipher.decrypt(kmsData['Plaintext'], acModelResp['enc_common_config_data'])),
      appConfigData: JSON.parse(csModelObj.localCipher.decrypt(kmsData['Plaintext'], acModelResp['enc_app_config_data'])),
      opsConfigData: JSON.parse(csModelObj.localCipher.decrypt(kmsData['Plaintext'], acModelResp['enc_ops_config_data']))
    };

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

    let fileName = oThis.constants.getAppConfigDataFileName(oThis.stack, oThis.env, options.subEnv, options.app)
      , fileOpsObj = new FileOps();
    let fileOpsResp = await fileOpsObj.create(fileName, data);
    if(fileOpsResp){
      return await fileOpsObj.open(fileName);
    }

    return false;

  }

};

Object.assign(AppConfigGet.prototype, servicePrototype);

/**
 * Get App Config
 * @module services/app_config/get
 */
module.exports = AppConfigGet;
