"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const ApiConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

ApiConstant.prototype = Object.create(BaseConstant.prototype);
ApiConstant.prototype.constructor = ApiConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(ApiConstant.prototype, AppConstantPrototype);
module.exports = ApiConstant;
