'use strict';

const rootPrefix = '../..'
  , stackConfigsModel = require(rootPrefix + '/models/stack_configs')
  , CipherSlatsModel = require(rootPrefix + '/models/cipher_salts')
  , KMSGenerateDataKey = require(rootPrefix + '/lib/aws/kms/generate_data_key')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Platform Create
 * @class
 */
const CreatePlatform = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

CreatePlatform.prototype = Object.create(ServiceBase.prototype);
CreatePlatform.prototype.constructor = CreatePlatform;


const servicePrototype = {

  /**
   * Create Service for platform
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {boolean} options.awsAccountId - AWS account id
   * @param {boolean} options.awsRegion - AWS region
   * @returns {(Object|boolean)} Platform data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_pc_v1');
    }

    if(!options.awsAccountId){
      throw oThis.getError('Invalid AWS account id!', 'err_ser_pc_v2');
    }

    if(!oThis.constants.awsRegions().includes(options.awsRegion)){
      throw oThis.getError('Invalid AWS region!', 'err_ser_pc_v3');
    }

    // Get KMS info for stack
    let scModelObj = new stackConfigsModel();
    let pcResp = await scModelObj.getByStackIdEnvSubEnv(oThis.stack, oThis.env, options.subEnv);

    let kmsSaltPlainText = null
      , cipherSaltId = null;
    ;

    if(pcResp && pcResp.length > 0){
      return false;
    }

    // Create cipher salts for stack
    let initParams = await oThis.getStackInitParams();
    let kmsObj = new KMSGenerateDataKey(initParams);
    let kmsResp = await kmsObj.perform(
      Object.assign(
        {app: oThis.constants.stackApp, kmsKeyId: oThis.constants.envConstants.INFRA_AWS_KMS_KEY_ID},
        oThis.params
      )
    );

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

      // Create entry for env stack
      let createParams = {
        stackId: oThis.stack,
        env: oThis.env,
        subEnv: options.subEnv,
        awsAccountId: options.awsAccountId,
        awsRegion: options.awsRegion,
        stackData: scModelObj.localCipher.encrypt(kmsSaltPlainText, JSON.stringify({})),
        commonData: JSON.stringify({}),
        cipherSaltId: cipherSaltId,
      };

      scModelObj = new stackConfigsModel();
      let queryResp = await scModelObj.create(createParams);
      if(queryResp && queryResp['insertId']){
        return true
      }

    }

    return false;
  }

};

Object.assign(CreatePlatform.prototype, servicePrototype);

/**
 * Create platform data
 * @module services/platform/create
 */
module.exports = CreatePlatform;