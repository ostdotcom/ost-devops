"use strict";

const rootPrefix = '../..'
  , format = require("string-template")
;

const AppConstants = function (params) {
  const oThis = this
  ;

  params = params || {};

  oThis.stack = params.stack;
  oThis.env = params.env;
  oThis.subEnv = params.subEnv;
  oThis.app = params.app;
  oThis.awsAccountId = params.awsAccountId;
  oThis.awsRegion = params.awsRegion;
};

AppConstants.prototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    return Object.assign({}, JSON.parse(JSON.stringify(oThis.getAppConstants(options))), JSON.parse(JSON.stringify(oThis.getAWSServiceConstants(options))));
  },

  getAppConstants: function (options) {
    const oThis = this
    ;

    let appConstants = {};
    if(oThis.app){
      appConstants[oThis.app] = require(rootPrefix + `/config/aws/${oThis.env}/${oThis.app}.json`);
    }

    return appConstants;
  },
  
  getAWSServiceConstants: function (options) {
    const oThis = this
    ;

    return {
      ec2: require(rootPrefix + `/config/aws/${oThis.env}/ec2.json`),
      elasticache: require(rootPrefix + `/config/aws/${oThis.env}/elasticache.json`),
      es: require(rootPrefix + `/config/aws/${oThis.env}/es.json`),
      lambda: require(rootPrefix + `/config/aws/${oThis.env}/lambda.json`),
      iam: require(rootPrefix + `/config/aws/${oThis.env}/iam.json`),
      kms: require(rootPrefix + `/config/aws/${oThis.env}/kms.json`),
    };
  },

  envStackShort: function(){
    const oThis = this
    ;

    return `${oThis.env.substr(0, 1)}${oThis.stack}`;
  },

  envStackLong: function(){
    const oThis = this
    ;

    return `${oThis.env}-${oThis.stack}`;
  },

  envSubEnvPrefix: function(){
    const oThis = this
    ;

    return `${oThis.env.substr(0, 1)}_${oThis.subEnv.substr(0, 1)}`;
  },

  subEnvShort: function(){
    const oThis = this
    ;

    return `${oThis.subEnv.substr(0, 4)}`;
  },

  subEnvLong: function(){
    const oThis = this
    ;

    return `${oThis.subEnv}`;
  },

  formatStr: function (str, map) {
    return format(str, map);
  },

  // EC2 helper methods
  ec2NamePrefix: function () {
    const oThis = this
    ;

    return `${oThis.envStackLong()}-${oThis.subEnvShort()}:`;
  },

  // EC2 network interface
  ec2NewtorkInterfaces: function (availZone, subNetIdMap, securityGroupsMap) {
    let val = {};

    if(availZone === 'public_1a' || availZone === 'public_1b'){

      let NetworkInterfaces = [];
      NetworkInterfaces.push({
        AssociatePublicIpAddress: true,
        DeviceIndex: 0,
        SubnetId: subNetIdMap['SubnetId'],
        Groups: securityGroupsMap['SecurityGroupIds']
      });
      val['NetworkInterfaces'] = NetworkInterfaces;

    } else {

      val = Object.assign(val, subNetIdMap, securityGroupsMap);

    }

    return val;
  }

};

module.exports = AppConstants;
