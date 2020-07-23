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
const EC2GetInstanceDetailsKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

EC2GetInstanceDetailsKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
EC2GetInstanceDetailsKlass.prototype.constructor = EC2GetInstanceDetailsKlass;

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
   * Get EC@ instance details
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

    if(!options.instanceIds || Array.isArray(options.instanceIds) === false){
      throw oThis.getError(`Invalid instanceIds for ${oThis.constructor.name}`, 'err_ec2_gid_v_1');
    }

  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.instanceIds
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  let params = {
    InstanceIds: options.instanceIds
  };

  return oThis._awsServiceRequest('oThis.awsClient.ec2()', 'describeInstances', params);
};

Object.assign(EC2GetInstanceDetailsKlass.prototype, Ec2ServicePrototype);
module.exports = EC2GetInstanceDetailsKlass;
