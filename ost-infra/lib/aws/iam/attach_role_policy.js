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
const AttachIAMRolePolicyKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

AttachIAMRolePolicyKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
AttachIAMRolePolicyKlass.prototype.constructor = AttachIAMRolePolicyKlass;

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
   * Attach IAM policy to role
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
* - options.policyArn
* - options.roleName
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  const constantsObj = oThis.constantsObj;
  let params = {};
  params.PolicyArn = options.policyArn || constantsObj.getIAMPolicyArn({policyName: options.name});
  params.RoleName = options.roleName || constantsObj.getIAMRoleName({roleName: options.name});

  return oThis._awsServiceRequest('oThis.awsClient.iam()', 'attachRolePolicy', params);
};

Object.assign(AttachIAMRolePolicyKlass.prototype, Ec2ServicePrototype);
module.exports = AttachIAMRolePolicyKlass;
