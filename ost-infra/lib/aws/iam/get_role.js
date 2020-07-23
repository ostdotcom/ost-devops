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
const GetIAMRoleKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

GetIAMRoleKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
GetIAMRoleKlass.prototype.constructor = GetIAMRoleKlass;

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
   * Get IAM role details
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

      throw oThis.getError(`Invalid name for ${oThis.constructor.name}`, 'err_iam_gr_v_1');
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

  const constantsObj = oThis.constantsObj;
  let params = {
    RoleName: constantsObj.getIAMRoleName({roleName: options.name})
  };

  return oThis._awsServiceRequest('oThis.awsClient.iam()', 'getRole', params);
};

Object.assign(GetIAMRoleKlass.prototype, Ec2ServicePrototype);
module.exports = GetIAMRoleKlass;
