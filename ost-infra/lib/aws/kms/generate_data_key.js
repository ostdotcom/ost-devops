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
const GenerateDataKeyKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

GenerateDataKeyKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
GenerateDataKeyKlass.prototype.constructor = GenerateDataKeyKlass;

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
   * Generate KMS data key
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

    if(!options.kmsKeyId || options.kmsKeyId == ''){

      throw oThis.getError(`Invalid kmsKeyId for ${oThis.constructor.name}`, 'err_kms_gdk_v_1');
    }
  }
};


// Private Methods

/*
* Params::
* - options.kmsKeyId
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  let params = {
    KeyId: options.kmsKeyId,
    KeySpec: 'AES_256'
  };

  return oThis._awsServiceRequest('oThis.awsClient.kms()', 'generateDataKey', params);
};

Object.assign(GenerateDataKeyKlass.prototype, Ec2ServicePrototype);
module.exports = GenerateDataKeyKlass;
