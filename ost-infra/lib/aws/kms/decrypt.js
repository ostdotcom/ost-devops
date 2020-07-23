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
const DecryptKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

DecryptKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
DecryptKlass.prototype.constructor = DecryptKlass;

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
   * Decrypt data from cipherTextBlog
   *
   * @return {Promise<Result>}
   */
  perform: async function (options) {
    const oThis = this
    ;

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

    if(!options.cipherTextBlob || options.cipherTextBlob == ''){

      throw oThis.getError(`Invalid cipherTextBlob for ${oThis.constructor.name}`, 'err_kms_d_v_1');
    }
  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.cipherTextBlob
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  let params = {
    CiphertextBlob: options.cipherTextBlob
  };

  return oThis._awsServiceRequest('oThis.awsClient.kms()', 'decrypt', params);
};

Object.assign(DecryptKlass.prototype, Ec2ServicePrototype);
module.exports = DecryptKlass;
