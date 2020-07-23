"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const MappyApiConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

MappyApiConstant.prototype = Object.create(BaseConstant.prototype);
MappyApiConstant.prototype.constructor = MappyApiConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(MappyApiConstant.prototype, AppConstantPrototype);
module.exports = MappyApiConstant;
