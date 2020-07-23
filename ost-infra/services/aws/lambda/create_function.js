"use strict";

const rootPrefix = '../../..'
  , CreateLambdaFunction = require(rootPrefix + '/lib/aws/lambda/create_function')
  , AWSServiceBase = require(rootPrefix + '/services/service_base')
;

const ServiceCreateLambdaFunction = function(params) {
  const oThis = this
  ;

  AWSServiceBase.call(oThis, params);
};

ServiceCreateLambdaFunction.prototype = Object.create(AWSServiceBase.prototype);
ServiceCreateLambdaFunction.prototype.constructor = ServiceCreateLambdaFunction;

const awsServicePrototype = {

  perform: function (options) {
    const oThis = this
    ;
    return AWSServiceBase.prototype.perform.call(oThis, options);
  },

  servicePerform: async function (options) {
    const oThis = this
    ;

    // Get subnet groups
    let initParams = oThis.getInitParams()
      , serviceObj =  new CreateLambdaFunction(initParams)
      , finalResp = {}
    ;

    let resp = await serviceObj.perform(options);

    console.log("resp: %s", JSON.stringify(resp));

    return finalResp;

  },

};

Object.assign(ServiceCreateLambdaFunction.prototype, awsServicePrototype);
module.exports = ServiceCreateLambdaFunction;
