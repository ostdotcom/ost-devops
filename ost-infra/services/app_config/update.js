'use strict';

const rootPrefix = '../..'
  , stackConfigsModel = require(rootPrefix + '/models/stack_configs')
  , AppConfigsModel = require(rootPrefix + '/models/app_configs')
  , CipherSlatsModel = require(rootPrefix + '/models/cipher_salts')
  , KMSDecryptData = require(rootPrefix + '/lib/aws/kms/decrypt')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Platform Update
 * @class
 */
const AppConfigsUpdate = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

AppConfigsUpdate.prototype = Object.create(ServiceBase.prototype);
AppConfigsUpdate.prototype.constructor = AppConfigsUpdate;


const servicePrototype = {

  /**
   * Update Service for platform
   * @constructor
   * @param {string} options.app - Application identifier
   * @param {string} options.subEnv - Sub environment name
   * @returns {(Object|boolean)} App Config data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    options = options || {};

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_acu_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_acu_v2');
    }

    // Get file Data
    let fileData = oThis.getFileData(options);

    if(!fileData){
      return false;
    }

    // Get stack configs from DB
    let scModelObj = new stackConfigsModel();
    let scModelResp = (await scModelObj.getByStackIdEnvSubEnv(oThis.stack, oThis.env, options.subEnv))[0];
    if(!scModelResp){
      return false;
    }

    // Get app configs from DB
    let acModelObj = new AppConfigsModel();
    let acModelResp = (await acModelObj.getByAppIdStackConfigId(options.app, scModelResp['id']))[0];
    if(!acModelResp){
      return false;
    }

    // Get KMS plainText from cipherTextBlob to encrypt data
    let cipherModelObj = new CipherSlatsModel();
    let cipherResp = (await cipherModelObj.getById(acModelResp['cipher_salt_id']))[0];

    if(!cipherResp){
      return false;
    }

    let initParams = await oThis.getAppInitParams(options.subEnv);
    let kmsDecryptObj = new KMSDecryptData(initParams);
    let resp = await kmsDecryptObj.perform({
      app: oThis.constants.stackApp,
      cipherTextBlob: cipherResp['kms_cipher_text_blob']
    });

    if(resp.err){
      return false;
    }
    let respData = resp.data;

    // Update file data in DB
    let commonConfigData = fileData[oThis.constants.appConfig.commonConfigDataKey]
      , appConfigData = fileData[oThis.constants.appConfig.appConfigDataKey]
      , opsConfigData = fileData[oThis.constants.appConfig.opsConfigDataKey]
    ;

    if(!commonConfigData || !appConfigData || !opsConfigData){
      throw oThis.getError('Invalid config data!', 'err_ser_acu_v3');
    }

    acModelObj = new AppConfigsModel();
    let encCommonConfigData = acModelObj.localCipher.encrypt(respData['Plaintext'], JSON.stringify(commonConfigData));
    let encAppConfigData = acModelObj.localCipher.encrypt(respData['Plaintext'], JSON.stringify(appConfigData));
    let encOpsConfigData = acModelObj.localCipher.encrypt(respData['Plaintext'], JSON.stringify(opsConfigData));

    acModelResp = await acModelObj.updateCommonConfigAppConfigOpsConfigById(encCommonConfigData, encAppConfigData, encOpsConfigData, acModelResp['id']);

    if(acModelResp && acModelResp['affectedRows'] > 0){
      return true;
    }

    return false;
  },

  getFileData: function (options) {
    const oThis = this
    ;

    let fileName = oThis.constants.getAppConfigDataFileName(oThis.stack, oThis.env, options.subEnv, options.app)
      , fileOpsObj = new FileOps();

    let fileOpsResp = fileOpsObj.loadFile(fileName);

    return fileOpsResp;

  }

};

Object.assign(AppConfigsUpdate.prototype, servicePrototype);

/**
 * Update platform data
 * @module services/platform/update
 */
module.exports = AppConfigsUpdate;