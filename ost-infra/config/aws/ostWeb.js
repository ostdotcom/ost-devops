"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const OstWebConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

OstWebConstant.prototype = Object.create(BaseConstant.prototype);
OstWebConstant.prototype.constructor = OstWebConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(OstWebConstant.prototype, AppConstantPrototype);
module.exports = OstWebConstant;
