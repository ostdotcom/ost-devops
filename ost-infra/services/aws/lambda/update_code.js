'use strict';

const rootPrefix = '../../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Update code for lambda function
 * @class
 */
const LambdaUpdateCode = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

LambdaUpdateCode.prototype = Object.create(ServiceBase.prototype);
LambdaUpdateCode.prototype.constructor = LambdaUpdateCode;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_aws_l_uc_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_aws_l_uc_v2');
    }

    if(!options.branchName){
      throw oThis.getError('Invalid branchName!', 'err_ser_aws_l_uc_v3');
    }

    let initParams = await oThis.getAppInitParams(options.subEnv);
    oThis.shellExec = new ShellExecKlass(initParams);

  },

  /**
   * Build app code for application
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.app - Application identifier
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.branchName - Git branch name
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    // Get stack config details
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if(scGetServiceResp.err){
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_aws_l_uc_sp1');
    }
    let scRespData = scGetServiceResp['data']
      , scCommonData = scRespData[oThis.constants.platform.commonDataKey]
    ;

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_aws_l_uc_sp2');
    }

    let acRespData = acGetServiceResp['data']
      , appConfigData = acRespData[oThis.constants.appConfig.appConfigDataKey]
      , opsConfigData = acRespData[oThis.constants.appConfig.opsConfigDataKey]
    ;

    let s3Bucket = scCommonData['buildS3Bucket']
      , buildNumber = (new Date()).getTime()
      , awsCliProfile = oThis.constants.getAwsCliProfile(oThis.stack, oThis.env, options.subEnv, options.app)
    ;

    let lambdaFunctionsArr = [];
    if (opsConfigData['lambdaFunctions'] && opsConfigData['lambdaFunctions'].length > 0){
      lambdaFunctionsArr = opsConfigData['lambdaFunctions'];
    } else {
      throw oThis.getError(`No Lambda functions defined for app: ${options.app}`, 'err_ser_aws_l_uc_sp3');
    }

    for(let i=0;i<lambdaFunctionsArr.length;i++){

      let lambdaFunctionDetails = lambdaFunctionsArr[i];
      let functionArn = lambdaFunctionDetails['functionArn'];
      let packageFile = lambdaFunctionDetails['packageFile'];

      let runResp = await oThis.shellExec.updateLambdaCode(
        options.app, options.branchName, buildNumber, s3Bucket, awsCliProfile, functionArn, packageFile
      );

      if(!runResp){
        throw oThis.getError(`Error running build for app: ${options.app}`, 'err_ser_aws_l_uc_sp4');
      }
    }

    return true;

  }

};

Object.assign(LambdaUpdateCode.prototype, servicePrototype);

/**
 * Update code for lambda function
 * @module services/aws/lambda/update_code
 */
module.exports = LambdaUpdateCode;