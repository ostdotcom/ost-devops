"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const RabbitSaasApiConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

RabbitSaasApiConstant.prototype = Object.create(BaseConstant.prototype);
RabbitSaasApiConstant.prototype.constructor = RabbitSaasApiConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(RabbitSaasApiConstant.prototype, AppConstantPrototype);
module.exports = RabbitSaasApiConstant;
