'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Build app code for application
 * @class
 */
const BuildAppCode = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

BuildAppCode.prototype = Object.create(ServiceBase.prototype);
BuildAppCode.prototype.constructor = BuildAppCode;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_bld_v1');
    }

    // Check if build and deploy required for given app
    if (!oThis.constants.isBuildDeployRequired().includes(options.app)){
      return true;
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_bld_v2');
    }

    if(!options.branchName){
      throw oThis.getError('Invalid branchName!', 'err_ser_as_bld_v3');
    }

    if(options.branchName === 'master'){
      throw oThis.getError('Build from master is not allowed!', 'err_ser_as_bld_v4');
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
   * @param {string} options.githubRepo - Git repo name
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    if (!oThis.constants.isBuildDeployRequired().includes(options.app)){
      console.log(`\n*************** Build and deploy not required for ${options.app} ***************\n`);
      return {};
    }

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
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_dpl_sp1');
    }
    let scRespData = scGetServiceResp['data']
      , scCommonData = scRespData[oThis.constants.platform.commonDataKey]
;
    let s3Bucket = scCommonData['buildS3Bucket']
      , buildPath = oThis.constants.getAppBuildPath(options.app)
      , s3BuildPath = `s3://${s3Bucket}/${oThis.constants.appDeploymentDir}/${buildPath}`
      , buildNumber = (new Date()).getTime()
      , awsCliProfile = oThis.constants.getAwsCliProfile(oThis.stack, oThis.env, options.subEnv, options.app)
    ;

    let runResp = await oThis.shellExec.runBuild(options.app, options.branchName, buildNumber, s3BuildPath, awsCliProfile,oThis.env,options.githubRepo||"");

    if(!runResp){
      throw oThis.getError(`Error running build for app: ${options.app}`, 'err_ser_bld_sp4');
    }

    return {buildNumber: buildNumber};

  },


};

Object.assign(BuildAppCode.prototype, servicePrototype);

/**
 * Activate systemd service via ansible
 * @module services/ansible/build
 */
module.exports = BuildAppCode;
