'use strict';

const rootPrefix = '../..'
  , stackConfigsModel = require(rootPrefix + '/models/stack_configs')
  , CipherSlatsModel = require(rootPrefix + '/models/cipher_salts')
  , KMSDecryptData = require(rootPrefix + '/lib/aws/kms/decrypt')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
;

/**
 * Platform Get
 * @class
 */
const PlatformGet = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

PlatformGet.prototype = Object.create(ServiceBase.prototype);
PlatformGet.prototype.constructor = PlatformGet;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_pg_v1');
    }
  },

  /**
   * Get Service
   * @constructor
   * @param {Object} options - Get service optional parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {boolean} options.getInFile - Whether to write platform data to file or not
   * @returns {(Object|boolean)} Platform data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    options = options || {};

    // Get KMS info for stack
    let scModelObj = new stackConfigsModel();
    let scModelResp = (await scModelObj.getByStackIdEnvSubEnv(oThis.stack, oThis.env, options.subEnv))[0];

    if(!scModelResp){
      return false;
    }

    // Get cipher salts for stack
    let csModelObj = new CipherSlatsModel();
    let csModelResp = (await csModelObj.getById(scModelResp['cipher_salt_id']))[0];

    if(!csModelResp){
      return false;
    }

    // Decrypt cipher blob
    let initParams = await oThis.getStackInitParams();
    let kmsObj = new KMSDecryptData(initParams);
    let kmsResp = await kmsObj.perform({
      app: oThis.constants.stackApp,
      cipherTextBlob: csModelResp['kms_cipher_text_blob']
    });

    if(kmsResp['err']){
      return false;
    }

    let kmsData  = kmsResp['data'];

    let finalResp = {};
    finalResp[oThis.constants.platform.stackDataKey] = JSON.parse(csModelObj.localCipher.decrypt(kmsData['Plaintext'], scModelResp['enc_stack_data']));
    finalResp[oThis.constants.platform.commonDataKey] = JSON.parse(scModelResp['common_data']);

    if(options.getInFile){
      return oThis.populateInFile(options, finalResp);
    } else {

      // Validate platform config data for internal calls
      if(!oThis.Helper.platform.hasValidStackData(oThis.stack, finalResp)){
        throw oThis.getError(`Required stack keys are not present for stack: ${oThis.stack}`, 'err_ser_pg_sp1');
      }

      finalResp['id'] = scModelResp['id'];
      finalResp['stackId'] = scModelResp['stack_id'];
      finalResp['env'] = scModelResp['env'];
      finalResp['subEnv'] = scModelResp['sub_env'];
      finalResp['awsRegion'] = scModelResp['aws_region'];
      finalResp['awsAccountId'] = scModelResp['aws_account_id'];
      finalResp['cipherSaltId'] = scModelResp['cipher_salt_id'];
      finalResp['cipherTextBlob'] = csModelResp['kms_cipher_text_blob'];
      finalResp['plainText'] = kmsData['Plaintext'];
      return finalResp
    }

  },

  populateInFile: async function (options, data) {
    const oThis = this
    ;

    let fileName = oThis.constants.getPlatformDataFileName(oThis.stack, oThis.env, options.subEnv)
      , fileOpsObj = new FileOps();
    let fileOpsResp = await fileOpsObj.create(fileName, data);
    if(fileOpsResp){
      return await fileOpsObj.open(fileName);
    }

    return false;

  }

};

Object.assign(PlatformGet.prototype, servicePrototype);

/**
 * Get platform data module
 * @module services/platform/get
 */
module.exports = PlatformGet;
