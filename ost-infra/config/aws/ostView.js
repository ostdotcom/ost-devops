"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const OstViewConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

OstViewConstant.prototype = Object.create(BaseConstant.prototype);
OstViewConstant.prototype.constructor = OstViewConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(OstViewConstant.prototype, AppConstantPrototype);
module.exports = OstViewConstant;
