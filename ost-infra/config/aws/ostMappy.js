"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const OstMappyConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

OstMappyConstant.prototype = Object.create(BaseConstant.prototype);
OstMappyConstant.prototype.constructor = OstMappyConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(OstMappyConstant.prototype, AppConstantPrototype);
module.exports = OstMappyConstant;
