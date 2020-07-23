"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const CmsApiConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

CmsApiConstant.prototype = Object.create(BaseConstant.prototype);
CmsApiConstant.prototype.constructor = CmsApiConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(CmsApiConstant.prototype, AppConstantPrototype);
module.exports = CmsApiConstant;
