"use strict";

const rootPrefix = '../..'
  , BaseConstant = require(rootPrefix + '/config/aws/app_constants')
;


const SaasApiConstant = function (params) {
  const oThis = this
  ;

  BaseConstant.call(oThis, params);
};

SaasApiConstant.prototype = Object.create(BaseConstant.prototype);
SaasApiConstant.prototype.constructor = SaasApiConstant;

const AppConstantPrototype = {

  getConstants: function (options) {
    const oThis = this
    ;

    let resp = BaseConstant.prototype.getConstants.call(oThis, options);

    return Object.assign({}, resp);
  },

  // Cache helper methods
  getCacheNodeName: function (options) {
    const oThis = this
    ;

    return `${oThis.envStackShort()}-${oThis.subEnvShort()}-${options.cacheType.substr(0, 3)}-c${options.chainId}`;
  },

  getCacheSubnetGroupName: function (options) {
    const oThis = this
    ;

    return `${oThis.subEnvShort()}-${oThis.app}-${options.cacheType.substr(0, 3)}`;
  },

  // ES helper methods

  esDomainName: function (options) {
    const oThis = this;
    return `${oThis.envStackShort()}-${oThis.subEnvShort()}-c${options.chainId}`;
  },

  esAccessPolicyResourceStr: function (options) {
    const oThis = this;
    return `arn:aws:es:${oThis.awsRegion}:${oThis.awsAccountId}:domain/${oThis.esDomainName(options)}/*`;
  },

  esAvalableVolumeTypes: function () {
    return ['standard', 'gp2', 'io1'];
  },
  
  // Lambda helper methods
  
  lambdaFuncName: function (options) {
    const  oThis = this;
    return `${oThis.envStackShort()}_${oThis.subEnvShort()}_${oThis.app}_c${options.chainId}_DDB_to_ES`;
  },

  // IAM helper methods
  getIAMPolicyTemplateStr: function (options) {
    const  oThis = this;

    let constants = oThis.getConstants()
      , appConstants = constants[oThis.app]
    ;

    let finalTemplate = {Version: "2012-10-17", Statement: []}
      , policyStatements = JSON.parse(JSON.stringify(appConstants[`IAMPolicyStatements_${options.policyName}`]))
    ;

    for(let i=0;i<policyStatements.length;i++){
      let item = policyStatements[i];
      item.Resource = oThis.formatStr(item.Resource, Object.assign({
        awsRegion: oThis.awsRegion,
        awsAccountId: oThis.awsAccountId,
        envPrefix: oThis.envSubEnvPrefix()
      }, options))
    }
    finalTemplate.Statement = policyStatements;

    return JSON.stringify(finalTemplate);
  },

  getIAMPolicyName: function (options) {
    const  oThis = this;
    return `${oThis.subEnv}${options.policyName}`;
  },

  getIAMRoleName: function (options) {
    const  oThis = this;
    return `${oThis.subEnv}${options.roleName}`;
  },

  getIAMPolicyArn: function (options) {
    const  oThis = this;
    return `arn:aws:iam::${oThis.awsAccountId}:policy/${oThis.getIAMPolicyName(options)}`;
  },

};


Object.assign(SaasApiConstant.prototype, AppConstantPrototype);
module.exports = SaasApiConstant;
