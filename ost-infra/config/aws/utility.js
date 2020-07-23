"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const UtilityNodeConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

UtilityNodeConstant.prototype = Object.create(BaseConstant.prototype);
UtilityNodeConstant.prototype.constructor = UtilityNodeConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(UtilityNodeConstant.prototype, AppConstantPrototype);
module.exports = UtilityNodeConstant;
