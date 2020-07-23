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
const Ec2ServiceStartKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

Ec2ServiceStartKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
Ec2ServiceStartKlass.prototype.constructor = Ec2ServiceStartKlass;

const Ec2ServicePrototype = {

  /**
   * Check EC2 instance status based on its state
   *
   * @return {Promise<Result>} - Create instance promise results
   */
  perform: async function (options) {
    const oThis = this
    ;
    console.log(options);
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

    return startInstance.call(oThis, options);
  },

  /**
   * validate passed parameters
   */
  validate: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.validate.call(oThis,options);

    if(!options.instanceIds || Array.isArray(options.instanceIds) === false){
      throw oThis.getError(`Invalid instanceIds for ${oThis.constructor.name}`, 'err_ec2_start_v_1');
    }

  }
};


// Private Methods

/**
 * Params:
 * - options.instanceIds
 *
 */

var startInstance = async function (options) {
  const oThis = this
  ;
   var params = {
      InstanceIds: options.instanceIds
    };
    return oThis._awsServiceRequest('oThis.awsClient.ec2()', 'startInstances', params);



};

Object.assign(Ec2ServiceStartKlass.prototype, Ec2ServicePrototype);
module.exports = Ec2ServiceStartKlass;
