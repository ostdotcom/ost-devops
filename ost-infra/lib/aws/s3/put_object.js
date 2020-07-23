"use strict";

const rootPrefix = '../../..'
  , Ec2ServiceBaseKlass = require(rootPrefix + '/lib/aws/base')
;

/**
 * constructor
 *
 * @param {Object} params
 *
 * @constructor
 */
const S3PutObjectKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

S3PutObjectKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
S3PutObjectKlass.prototype.constructor = S3PutObjectKlass;

const Ec2ServicePrototype = {

  /**
   * Initialize values
   */
  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

  },

  /**
   * Put object in S3
   *
   * @return {Promise<Result>}
   */
  perform: async function (options) {
    const oThis = this
    ;

    // Create instance
    return Ec2ServiceBaseKlass.prototype.perform.call(oThis, options);

  },

  /**
   * Perform action
   *
   * @return {Promise}
   */
  asyncPerform: function(options) {
    const oThis = this
    ;

    return _performMethod.call(oThis, options);
  },

  /**
   * validate passed parameters
   */
  validate: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.validate.call(oThis, options);

    if(!options.data || options.data == ''){

      throw oThis.getError(`Invalid data for ${oThis.constructor.name}`, 'err_s3_po_v_1');
    }

    if(!options.S3Bucket || options.S3Bucket == ''){

      throw oThis.getError(`Invalid S3Bucket for ${oThis.constructor.name}`, 'err_s3_po_v_2');
    }

    if(!options.S3FileKey || options.S3FileKey == ''){

      throw oThis.getError(`Invalid S3FileKey for ${oThis.constructor.name}`, 'err_s3_po_v_3');
    }
  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.data
* - options.S3Bucket
* - options.S3FileKey
* - options.KMSKeyId
* */

const _performMethod = function (options) {
  const oThis = this
  ;


  let params = {
    Body: options.data,
    Bucket: options.S3Bucket,
    Key: options.S3FileKey
  };

  if(options.KMSKeyId){
    params['SSEKMSKeyId'] = options.KMSKeyId;
    params['ServerSideEncryption'] = 'aws:kms'
  }

  return oThis._awsServiceRequest('oThis.awsClient.s3()', 'putObject', params);
};

Object.assign(S3PutObjectKlass.prototype, Ec2ServicePrototype);
module.exports = S3PutObjectKlass;
