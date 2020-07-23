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
const Ec2ServiceEditKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

Ec2ServiceEditKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
Ec2ServiceEditKlass.prototype.constructor = Ec2ServiceEditKlass;

const Ec2ServicePrototype = {

  /**
   * Initialize values
   */
  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

    options.allowedAttributes = ['disableTerminationProtection'];

  },

  /**
   * Perform EC2 operation
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
   * Perform EC2 operation action
   *
   * @return {Promise<Result>}
   */
  asyncPerform: function(options) {
    const oThis = this
    ;

    return editInstance.call(oThis, options);
  },

  /**
   * validate passed parameters
   */
  validate: function (options) {
    const oThis = this
    ;

    console.log("options.updateAttributes: %s", JSON.stringify(options.updateAttributes));

    if(!options.updateAttributes || Object.keys(options.updateAttributes).length == 0){
      throw oThis.getError(`No update attributes for ${oThis.constructor.name}`, 'err_ec2_ei_cv_1');
    }

    for(var i=0;i<options.updateAttributes.length;i++){

      switch (options.allowedAttributes[i]) {

        case 'disableTerminationProtection':
          if(typeof(options.disableTerminationProtection) != 'boolean'){
            throw oThis.getError(`Invalid disableTerminationProtection for ${oThis.constructor.name}`, 'err_ec2_ei_v_1');
          }
          break;

        default:
          throw oThis.getError(`Invalid update attribute for ${oThis.constructor.name}`, 'err_ec2_ei_cv_2');
          break;
      }
    }

  }
};


// Private Methods

/*
* Options:
* - options.instanceId (String)
* - options.updateAttributes (Array)
* */

var editInstance = function (options) {
  const oThis = this
  ;

  return new Promise(function (resolve, reject) {

    var params = getEditParameters(options.updateAttributes);
    params['InstanceId'] = options.instanceId;
    console.log("params: %s", JSON.stringify(params));

    oThis.awsClient.ec2().modifyInstanceAttribute(params, function (err, data) {
      if (err) {
        console.log(err, err.stack);
        return reject(oThis.getError(`editInstance: ${err.message}`, 'err_ec2_ci_rej_1'));
      } else {
        return resolve(data);
      }
    });

  });

};

var getEditParameters = function (options) {

  var params = {};

  // Update Termination Protection
  if(options.disableTerminationProtection != null) {
    params['DisableApiTermination'] = {
      'Value': !options.disableTerminationProtection
    };
  }

  return params;

};

Object.assign(Ec2ServiceEditKlass.prototype, Ec2ServicePrototype);
module.exports = Ec2ServiceEditKlass;
