"use strict";

const rootPrefix = '../../..'
  , Ec2ServiceBaseKlass = require(rootPrefix + '/lib/aws/base')
;

/**
 * constructor
 *
 * @param {Object} params - EC2 create params
 *
 * @constructor
 */
const Ec2ServiceStatusKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

Ec2ServiceStatusKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
Ec2ServiceStatusKlass.prototype.constructor = Ec2ServiceStatusKlass;

const Ec2ServicePrototype = {

  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

    options.checkForState = options.checkForState || 'systemStatusOk';

  },

  /**
   * Check EC2 instance status based on its state
   *
   * @return {Promise<Result>} - Create instance promise results
   */
  perform: async function (options) {
    const oThis = this
    ;

    // Create instance
    return Ec2ServiceBaseKlass.prototype.perform.call(oThis, options);

  },

  /**
   * Perform EC2 instance status check
   *
   * @return {Promise<Result>} - Return
   */
  asyncPerform: function(options) {
    const oThis = this
    ;

    return checkStatus.call(oThis, options);
  },

  validate: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.validate.call(oThis, options);

    if(!options.instanceIds || Array.isArray(options.instanceIds) === false){
      throw oThis.getError(`Invalid instanceIds for ${oThis.constructor.name}`, 'err_ec2_sc_v_1');
    }

    if(!options.checkForState || options.checkForState == ''){
      throw oThis.getError(`Invalid checkForState for ${oThis.constructor.name}`, 'err_ec2_sc_v_2');
    }

  }
};


// Private Methods

/*
* Params::
* - options.instanceIds
* - options.checkForState
*
* */

var checkStatus = function (options) {
  const oThis = this
  ;

  // Add tags to the instance
  var params = {
    InstanceIds: options.instanceIds
  };

  return oThis._awsServiceRequest('oThis.awsClient.ec2()', 'waitFor', params, options.checkForState);
};

Object.assign(Ec2ServiceStatusKlass.prototype, Ec2ServicePrototype);
module.exports = Ec2ServiceStatusKlass;
