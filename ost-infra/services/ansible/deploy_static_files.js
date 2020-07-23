'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Deploy static files
 * @class
 */
const DeployStaticFiles = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

DeployStaticFiles.prototype = Object.create(ServiceBase.prototype);
DeployStaticFiles.prototype.constructor = DeployStaticFiles;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_dsf_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_dsf_v2');
    }

    if(!options.branchName){
      throw oThis.getError('Invalid branchName!', 'err_ser_as_dsf_v3');
    }

    if(options.branchName === 'master'){
      throw oThis.getError('Build from master is not allowed!', 'err_ser_as_dsf_v4');
    }

    let initParams = await oThis.getAppInitParams(options.subEnv);
    oThis.shellExec = new ShellExecKlass(initParams);

  },

  /**
   * Service perform
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.branchName - Git branch name
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    if (!oThis.constants.isStaticFilesDeployApp(options.app)) {
      console.log("******* Deploy not required for %s *******", options.app);
      return true;
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
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_dsf_sp1');
    }
    let scRespData = scGetServiceResp['data']
      , scCommonData = scRespData[oThis.constants.platform.commonDataKey]
      , scStackData = scRespData[oThis.constants.platform.stackDataKey]
    ;

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_dsf_sp2');
    }

    let acRespData = acGetServiceResp['data']
      , opsConfigData = acRespData[oThis.constants.appConfig.opsConfigDataKey]
    ;

    let s3Bucket = opsConfigData['staticFilesS3Bucket']
      , s3Path = opsConfigData['staticFilesS3Path']
      , buildFilesPath = opsConfigData['buildFilesPath']
      , s3FullPath = s3Path.length > 0 ? `s3://${s3Bucket}/${s3Path}` : `s3://${s3Bucket}`
      , awsCliProfile = oThis.constants.getAwsCliProfile(oThis.stack, oThis.env, options.subEnv, options.app)
    ;

    let runResp = await oThis.shellExec.deployStaticFiles(oThis.env, options.app, options.branchName, buildFilesPath, s3FullPath, awsCliProfile);

    if(!runResp){
      throw oThis.getError(`Error deploying static files for app: ${options.app}`, 'err_ser_dsf_sp3');
    }

    return runResp;

  }

};

Object.assign(DeployStaticFiles.prototype, servicePrototype);

/**
 * Deploy app build on app servers
 * @module services/ansible/deploy_static_files
 */
module.exports = DeployStaticFiles;
