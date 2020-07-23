"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const ValueConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

ValueConstant.prototype = Object.create(BaseConstant.prototype);
ValueConstant.prototype.constructor = ValueConstant;

const ValueConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(ValueConstant.prototype, ValueConstantPrototype);
module.exports = ValueConstant;
