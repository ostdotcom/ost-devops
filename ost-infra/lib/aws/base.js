"use strict";

const rootPrefix = '../..'
  , awsClientKlass = require(rootPrefix + '/lib/aws/aws')
  , CommonUtil = require(rootPrefix + '/lib/utils/common')
;

const AwsServiceBase = function (params) {
  const oThis = this
  ;

  oThis.stack = params.stack;
  oThis.env = params.env;
  oThis.subEnv = params.subEnv;

  oThis.awsAccountId = params.awsAccountId;
  oThis.awsRegion = params.awsRegion;

  // AWS Connection
  // oThis.awsClient = new awsClientKlass(params);
  oThis.awsClient = new awsClientKlass(params);
  oThis.utils = CommonUtil;
};

AwsServiceBase.prototype = {

  init: function (options) {
    const oThis = this
    ;

    options = options || {};

    if(oThis.subEnv == 'sandbox') {
      options.subEnv = 'default';
    }

  },

  perform: async function (options) {
    const oThis = this
    ;

    try {
      // Initialize default vars
      oThis.init(options);
      // Sanitize and validate parameters
      oThis.validate(options);

      return await oThis.asyncPerform(options)
        .then(function (data) {
          // console.log("AwsServiceBase -> asyncPerform: %s", JSON.stringify(data));
          return oThis.onSuccess(data);
        })
        .catch(function (err) {
          console.log("asyncPerform -> then-catch: %s", JSON.stringify(err));
          return oThis.onError(err);
        })
        ;
    } catch (err){
      console.log("asyncPerform -> try-catch: %s", JSON.stringify(err));
      return oThis.onError(err);
    };

  },

  asyncPerform: function () {
    const oThis = this
    ;
    oThis.onError(new Error(`Method not found for ${oThis.constructor.name}`));
  },

  validate: function (options) {
    const oThis = this
    ;
    if(!options.app || options.app == ''){

      throw oThis.getError(`Invalid app for ${oThis.constructor.name}`, 'err_aws_base_v_1');
    }

    // Get Constants Object for validations
    oThis.constantsObj = oThis.getConstantsObj(options.app);
  },

  getError: function (message, code) {
    const oThis = this
    ;

    var err = new Error();
    err.code = code || 'err_undefined';
    err.name = `${oThis.constructor.name}Error`;
    err.message = message;

    return err;
  },

  onError: function (err) {
    const oThis = this
    ;

    let clonedSelf = oThis.utils.clone(oThis);
    delete clonedSelf.awsClient.awsAccessKey;
    delete clonedSelf.awsClient.awsSecretKey;
    console.log(`onError: in ${oThis.constructor.name}:\n${err.message}\n${err.stack}\n${JSON.stringify(clonedSelf)}`);

    if(!err.code){
      throw err
    } else {
      return {err: err, data: null};
    }
  },

  onSuccess: function (data) {
    const oThis = this
    ;

    return {err: null, data: data};
  },

  getConstantsObj: function (app) {
    const oThis = this
    ;

    let constantKlass = require(rootPrefix + `/config/aws/${app}`)
      , constObj = new constantKlass({
      awsAccountId: oThis.awsAccountId,
      awsRegion: oThis.awsRegion,
      stack: oThis.stack,
      env: oThis.env,
      subEnv: oThis.subEnv,
      app: app
      });

    return constObj;
  },

  _awsServiceRequest: async function (moduleName, methodName, requestParams, state) {
    const oThis = this
    ;

    return new Promise(function (resolve, reject) {

      let methodCallStr = !state ? `${moduleName}.${methodName}(requestParams, callback)` : `${moduleName}.${methodName}(state, requestParams, callback)`;

      // console.log("\nAWS::API Request params:\t%s", JSON.stringify(requestParams));
      console.log("AWS::API Request method:\t%s", JSON.stringify(methodCallStr));

      var callback = function (err, data) {
        if (err) {
          console.log(err, err.stack);
          return reject(oThis.getError(`AWS::API Error: ${err.message}`, err.code));
        } else {
          //console.log("Request::response:\t%s\n", JSON.stringify(data));
          console.log("AWS::API Success with response");
          return resolve(data);
        }
      };

      eval(methodCallStr);

    });

  }

};

module.exports = AwsServiceBase;
