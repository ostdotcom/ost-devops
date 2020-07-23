'use strict';

const rootPrefix = '../..'
  , stackConfigsModel = require(rootPrefix + '/models/stack_configs')
  , CipherSlatsModel = require(rootPrefix + '/models/cipher_salts')
  , KMSDecryptData = require(rootPrefix + '/lib/aws/kms/decrypt')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
;

/**
 * Platform Update
 * @class
 */
const PlatformUpdate = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

PlatformUpdate.prototype = Object.create(ServiceBase.prototype);
PlatformUpdate.prototype.constructor = PlatformUpdate;


const servicePrototype = {

  /**
   * Update Service for platform
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @returns {(Object|boolean)} Platform data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    options = options || {};

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_pu_v1');
    }

    // Get file Data
    let fileData = oThis.getFileData(options);

    if(!fileData){
      return false;
    }

    // get stack configs db data
    let scModelObj = new stackConfigsModel();
    let dbData = (await scModelObj.getByStackIdEnvSubEnv(oThis.stack, oThis.env, options.subEnv))[0];
    if(!dbData){
      return false;
    }

    // Get KMS cipher blob to encrypt data
    let cipherModelObj = new CipherSlatsModel();
    let cipherResp = (await cipherModelObj.getById(dbData['cipher_salt_id']))[0];

    if(!cipherResp){
      return false;
    }

    let initParams = await oThis.getStackInitParams();
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
    scModelObj = new stackConfigsModel();
    let encStackData = scModelObj.localCipher.encrypt(respData['Plaintext'], JSON.stringify(fileData[oThis.constants.platform.stackDataKey]));
    let commonData = JSON.stringify(fileData[oThis.constants.platform.commonDataKey]);
    dbData = await scModelObj.updateStackDataAndCommonDataById(encStackData, commonData, dbData['id']);

    if(dbData && dbData['affectedRows'] > 0){
      return true;
    }

    return false;
  },

  getFileData: function (options) {
    const oThis = this
    ;

    let fileName = oThis.constants.getPlatformDataFileName(oThis.stack, oThis.env, options.subEnv)
      , fileOpsObj = new FileOps();

    let fileOpsResp = fileOpsObj.loadFile(fileName);

    return fileOpsResp;

  }

};

Object.assign(PlatformUpdate.prototype, servicePrototype);

/**
 * Update platform data
 * @module services/platform/update
 */
module.exports = PlatformUpdate;