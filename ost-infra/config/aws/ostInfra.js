"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const OSTInfraConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

OSTInfraConstant.prototype = Object.create(BaseConstant.prototype);
OSTInfraConstant.prototype.constructor = OSTInfraConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(OSTInfraConstant.prototype, AppConstantPrototype);
module.exports = OSTInfraConstant;
