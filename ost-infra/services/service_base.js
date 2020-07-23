"use strict";

const rootPrefix = '..'
  , Constants = require(rootPrefix + '/config/constants')
  , AWSConnection = require(rootPrefix + '/services/aws/aws_connection')
  , CommonUtil = require(rootPrefix + '/lib/utils/common')
  , Helper = require(rootPrefix + '/helpers/index')
  , CreateErrorLogEntry = require(rootPrefix + '/lib/error_logs/create_entry')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
;

const AwsServiceBase = function(params) {
  const oThis = this
  ;
  params = params || {};

  oThis.constants = new Constants();
  oThis.utils =  CommonUtil;
  oThis.Helper = Helper;
  oThis.uniqueRunId = new Date().getTime();

  if(!params.platformId ){
    throw 'Invalid platform identifier!';
  }

  if(!oThis.constants.envList().includes(params.env)){
    throw 'Invalid environment!';
  }

  oThis.stack = params.platformId;
  oThis.env = params.env;
  oThis.responseOutFile = params.responseOutFile;
  process.env['APP_ENV'] = oThis.env;
};

AwsServiceBase.prototype = {

  perform: async function (options) {
    const oThis = this
    ;

    let errObj;
    try {

      await oThis.validate(options);

      let resp = await oThis.servicePerform(options)
        .then(function (data) {
          return oThis.successData(data);
        })
        .catch(async function (err) {
          console.error("Service Error 1: ", err);
          errObj = oThis.getError(err, 'err_ser_b_e1');
          await oThis.registerInfraAlertForMediumSeverity({kind: errObj.code, data: errObj});
          return oThis.errorData(errObj);
        })
      ;

      await oThis.createResponseOutFile(resp);

      return resp

    } catch(err) {

      console.error("Service Error 2: ", err);
      errObj = oThis.getError(err, 'err_ser_b_e2');
      await oThis.registerInfraAlertForLowSeverity({kind: errObj.code, data: errObj});
      return oThis.errorData(errObj);

    }
  },

  // Write response to out file
  createResponseOutFile: async function (data) {
    const oThis = this;

    if(oThis.responseOutFile){
      await new FileOps().create(oThis.responseOutFile, data);
    }
  },

  validate: async function (options) {

  },

  successData: function (data) {
    return {err: null, data: data};
  },

  errorData: function (err) {
    return {err: err, data: null};
  },

  getError: function (errObj, code) {
    const oThis = this
    ;

    var err = new Error();
    err.code = errObj.hasOwnProperty('code') ? errObj.code : code;
    err.baseCode = code;
    err.name = `${oThis.constructor.name}Error`;
    if(errObj.hasOwnProperty('message')){
      err.message = errObj.message;
    }
    err.err = errObj;

    return err;
  },

  getStackInitParams: async function(){
    const oThis = this
    ;

    let awsConnObj = new AWSConnection();
    let awsConnParams = await awsConnObj.getConnectionParams();

    return Object.assign({stack: oThis.stack, env: oThis.env}, awsConnParams);
  },

  getAppInitParams: async function (subEnv) {
    const oThis = this
    ;

    let awsConnObj = new AWSConnection();
    let awsConnParams = await awsConnObj.getConnectionParams({
      stack: oThis.stack,
      env: oThis.env,
      subEnv: subEnv
    });

    return Object.assign({stack: oThis.stack, env: oThis.env, subEnv: subEnv}, awsConnParams);
  },

  setStackConfigData: async function (Klass, subEnv) {
    const oThis = this;

    // Get Stack config data
    let scGetServiceObj = new Klass({platformId: oThis.stack, env: oThis.env});
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: subEnv
    });

    if(scGetServiceResp.err){
      throw oThis.getError(`Error while fetching stack configs info for app: ${options.app}`, 'err_ser_sb_gscd1');
    }

    oThis.stackConfigData = scGetServiceResp['data'];
  },

  convertJsonToBash: function (jsonData) {

    let bashText = '#!/usr/bin/env bash';

    for(let key in jsonData){
      let val = jsonData[key];
      bashText = bashText + '\n' + `export ${key}="${val}"`;
    }

    return bashText;
  },

  /**
   * Register infra alerts for further processing
   * @constructor
   * @param {Object} options - Service parameters
   * @param {string} options.severity - Alert severity
   * @param {string} options.kind - Error entry kind
   * @param {string} options.data - Error data
   * @returns {Object} App server data
   */
  registerInfraAlert: async function (options) {
    const oThis = this;

    if(!oThis.constants.envConstants.INFRA_IP_ADDRESS){
      return false;
    }

    let errorEntry = new CreateErrorLogEntry({
      kind: options.kind,
      severity: options.severity,
      appName: oThis.constants.stackApp,
      envIdentifier: oThis.env,
      ipAddress: oThis.constants.envConstants.INFRA_IP_ADDRESS,
      data: options.data
    });

    await errorEntry.perform().catch(function (err) {
      console.error("Error creating error log entry => ", err);
    });
  },

  registerInfraAlertForLowSeverity: async function (options) {
    return await this.registerInfraAlert(Object.assign({severity: 'low'}, options));
  },

  registerInfraAlertForMediumSeverity: async function (options) {
    return await this.registerInfraAlert(Object.assign({severity: 'medium'}, options));
  },

  registerInfraAlertForHighSeverity: async function (options) {
    return await this.registerInfraAlert(Object.assign({severity: 'high'}, options));
  }

};

module.exports = AwsServiceBase;
