"use strict";

const rootPrefix = '../..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , Constants = new ConstantsKlass()
;

const connectionObjs = {};
const AwsConnection = function(params) {
  const oThis = this
  ;
};

AwsConnection.prototype = {

  getConnectionParams: async function (options) {
    const oThis = this
    ;
    options = options || {};

    let objkey = 'infra';
    if(options.stack && options.env && options.subEnv){
      objkey = `${options.stack}_${options.env}_${options.subEnv}`;
    }

    if(connectionObjs[objkey]){
      return connectionObjs[objkey];
    }

    // Create connection Object
    let connParams = null;
    if(options.stack && options.env && options.subEnv){

      // Get from DB
      let PlatformGetService = require(rootPrefix + '/services/platform/get');
      let performerObj = new PlatformGetService({platformId: options.stack, env: options.env});
      let performOptions = {subEnv: options.subEnv};
      let resp = await performerObj.perform(performOptions);
      if(resp.err){
        return connParams
      }
      let respData = resp.data;
      let stackData = respData[Constants.platform.stackDataKey];
      connParams = {
        awsAccessKey: stackData['aws']['accessKey'],
        awsSecretKey: stackData['aws']['keySecret'],
        kmsKeyId: stackData['aws']['kmsKeyId'],
        awsRegion: respData['awsRegion'],
        awsAccountId: respData['awsAccountId'],
      }

    }else {
      connParams = {
        awsAccessKey: Constants.envConstants.INFRA_AWS_ACCESS_KEY,
        awsSecretKey: Constants.envConstants.INFRA_AWS_KEY_SECRET,
        awsRegion: Constants.envConstants.INFRA_AWS_REGION,
        awsAccountId: Constants.envConstants.INFRA_AWS_ACCOUNT_ID,
      };
    }

    connectionObjs[objkey] = connParams;

    return connParams;
  }
};

module.exports = AwsConnection;
