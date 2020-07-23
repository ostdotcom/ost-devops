'use strict';

const rootPrefix = '../..'
  , StackConfigsModel = require(rootPrefix + '/models/stack_configs')
  , AppConfigsModel = require(rootPrefix + '/models/app_configs')
  , CipherSlatsModel = require(rootPrefix + '/models/cipher_salts')
  , KMSGenerateDataKey = require(rootPrefix + '/lib/aws/kms/generate_data_key')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * App Config Create
 * @class
 */
const CreateAppConfig = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

CreateAppConfig.prototype = Object.create(ServiceBase.prototype);
CreateAppConfig.prototype.constructor = CreateAppConfig;


const servicePrototype = {

  /**
   * Create Service for platform
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.app - Application identifier
   * @param {string} options.subEnv - Sub environment name
   * @returns {Object} App Config data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_apc_v2');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_apc_v2');
    }

    // Check if entry already exists
    let scModelObj = new StackConfigsModel();
    let scResp = (await scModelObj.getByStackIdEnvSubEnv(oThis.stack, oThis.env, options.subEnv))[0];

    if(!scResp){
      return false;
    }

    // Get entry
    let acModelObj = new AppConfigsModel();
    let acModelResp = (await acModelObj.getByAppIdStackConfigId(options.app, scResp['id']))[0];

    if(acModelResp){
      return true;
    }

    // Create cipher salts for app
    let initParams = await oThis.getAppInitParams(options.subEnv);
    let kmsObj = new KMSGenerateDataKey(initParams);
    let kmsResp = await kmsObj.perform({
      app: oThis.constants.stackApp,
      kmsKeyId: initParams['kmsKeyId']
    });

    let kmsSaltPlainText = null
      , cipherSaltId = null;
    ;

    if(kmsResp['data']) {
      let respData = kmsResp.data;

      let csModelObj = new CipherSlatsModel();
      let modelResp = await csModelObj.create({
        kmsCipherTextBlob: respData['CiphertextBlob'],
        kmsKeyId: respData['KeyId'],
      });

      if(modelResp['insertId']){
        kmsSaltPlainText = respData['Plaintext'];
        cipherSaltId = modelResp['insertId'];
      }
    } else {
      console.error('Error Generating KMS data encryption Key');
    }

    if(kmsSaltPlainText && cipherSaltId){

      // Create configs entry for app
      let createParams = {
        stackConfigId: scResp['id'],
        appId: options.app,
        env: oThis.env,
        subEnv: options.subEnv,
        awsAccountId: options.awsAccountId,
        commonConfigData: acModelObj.localCipher.encrypt(kmsSaltPlainText, JSON.stringify({})),
        appConfigData: acModelObj.localCipher.encrypt(kmsSaltPlainText, JSON.stringify({})),
        opsConfigData: acModelObj.localCipher.encrypt(kmsSaltPlainText, JSON.stringify({})),
        cipherSaltId: cipherSaltId,
      };

      acModelObj = new AppConfigsModel();
      let acModelResp = await acModelObj.create(createParams);
      if(acModelResp && acModelResp['insertId']){
        return true
      }

    }

    return false;
  }

};

Object.assign(CreateAppConfig.prototype, servicePrototype);

/**
 * Create app configs
 * @module services/app_config/create
 */
module.exports = CreateAppConfig;