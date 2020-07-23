"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const WebConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

WebConstant.prototype = Object.create(BaseConstant.prototype);
WebConstant.prototype.constructor = WebConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

};

Object.assign(WebConstant.prototype, AppConstantPrototype);
module.exports = WebConstant;
