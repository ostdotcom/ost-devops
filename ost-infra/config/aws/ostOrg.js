"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const OstOrgConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

OstOrgConstant.prototype = Object.create(BaseConstant.prototype);
OstOrgConstant.prototype.constructor = OstOrgConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(OstOrgConstant.prototype, AppConstantPrototype);
module.exports = OstOrgConstant;
