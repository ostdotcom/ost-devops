"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const OSTAnalyticsConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

OSTAnalyticsConstant.prototype = Object.create(BaseConstant.prototype);
OSTAnalyticsConstant.prototype.constructor = OSTAnalyticsConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(OSTAnalyticsConstant.prototype, AppConstantPrototype);
module.exports = OSTAnalyticsConstant;
