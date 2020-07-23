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
const CreateIAmRoleKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

CreateIAmRoleKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
CreateIAmRoleKlass.prototype.constructor = CreateIAmRoleKlass;

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
   * Create IAM role
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

    if(!options.name || options.name == ''){

      throw oThis.getError(`Invalid name for ${oThis.constructor.name}`, 'err_iam_cr_v_1');
    }
  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.name
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  const constantsObj = oThis.constantsObj
    , constants = constantsObj.getConstants()
    , appConstants = constants[options.app]
  ;
  let params = {}
    , assumeRolePolicyDocument = appConstants[`IAMAssumeRolePolicy_${options.name}`]
  ;
  params.AssumeRolePolicyDocument = JSON.stringify(assumeRolePolicyDocument);
  params.RoleName = constantsObj.getIAMRoleName({roleName: options.name});
  params.Description = `Perform ${options.name} actions for ${options.app}`;

  return oThis._awsServiceRequest('oThis.awsClient.iam()', 'createRole', params);
};

Object.assign(CreateIAmRoleKlass.prototype, Ec2ServicePrototype);
module.exports = CreateIAmRoleKlass;
