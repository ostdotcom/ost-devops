'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , UploadAppConfig = require(rootPrefix + '/services/app_config/upload')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')

;

/**
 * Build app code for application
 * @class
 */
const DeployBuild = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

DeployBuild.prototype = Object.create(ServiceBase.prototype);
DeployBuild.prototype.constructor = DeployBuild;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_db_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_db_v2');
    }

    if(!options.buildNumber){
      throw oThis.getError('Invalid buildNumber!', 'err_ser_as_db_v3');
    }

    options.restart = options.restart || false;


    let initParams = await oThis.getAppInitParams(options.subEnv);
    oThis.shellExec = new ShellExecKlass(initParams);

    options.restart = options.restart || false;
    options.copyDeployExecs = options.copyDeployExecs || false;

  },

  /**
   * Deploy app build on app servers
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.buildNumber - Git branch name
   * @param {boolean} options.restart - Whether to restart app services or not
   * @param {boolean} options.copyDeployExecs - Whether to Copy deploy executable files or not
   * @param {string} options.flushOptions - flush options
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @param {string} options.serviceAction - service actiopn to be taken restart or stop
   * @param {Number} options.chainId - chainId
   * @param {string} options.appStatus - App setup status that needs to be considered
   * @param {string} options.verifyAppConfigs - Whether to verify app configs or not, only for production
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    if (!oThis.constants.isBuildDeployRequired().includes(options.app)) {
      console.log(`********** Build and deploy not required for app: ${options.app} **********`);
      return true ;
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
      , scStackData = scRespData[oThis.constants.platform.stackDataKey]
    ;

    await oThis.validateAppConfig(options);

    let s3Bucket = scCommonData['buildS3Bucket']
      , appConfigPath = oThis.constants.getAppConfigPath(oThis.stack, oThis.env, options.subEnv, options.app)
      , s3ConfigPath = `s3://${s3Bucket}/${oThis.constants.appDeploymentDir}/${appConfigPath}`
      , buildPath = oThis.constants.getAppBuildPath(options.app)
      , s3BuildPath = `s3://${s3Bucket}/${oThis.constants.appDeploymentDir}/${buildPath}`

    ;

    // Upload app config file to S3
    let uploadConfigObj = new UploadAppConfig(commonParams);
    let uploadResp = await uploadConfigObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      buildNumber: options.buildNumber
    });

    // TODO:: Associate app configs with deployed build number

    if(uploadResp.err){
      throw oThis.getError(`Error uploading configuration file to S3 for app: ${options.app}`, 'err_ser_dpl_sp3');
    }


    // Generate ansible inventory yaml for deployment
    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app: options.app,
      appStatus: options.appStatus || oThis.Helper.appEC2.appEc2AppStatuses.deployReadyStatus,
      chainId: options.chainId,
      plainText: scRespData['plainText'],
      ipAddresses: options.ipAddresses
    });

    if (inventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Invalid inventory data for app-setup for app: ${options.app}`, 'err_ser_dpl_sp3.0');

    }
    let enodeFileName;
    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      inventoryData:inventoryData,
      lightInventory: true
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml for app: ${options.app}`, 'err_ser_dpl_sp4');
    }
    let serviceRespData = serviceResp['data'];

    let extraVars = {
      env: oThis.env,
      application: options.app,
      rpm_version: options.buildNumber,
      s3_builds_path: s3BuildPath,
      s3_configs_path: s3ConfigPath,
      aws_region: scRespData['awsRegion'],
      flushOptions: `'${options.flushOptions}'`,
      copy_execs: options.copyDeployExecs,
      serviceAction: options.serviceAction||"",
      serviceName: options.serviceName||"",
      enodes_input_file: enodeFileName||"",
      forceRestart: (options.force ? options.force : "")
    };
    if (oThis.constants.isQaApp().includes(options.app)){
      extraVars["qa_deploy"]=true;
    }
    let runResp = await oThis.shellExec.runDeploy(serviceRespData['file'],extraVars,options.ipAddresses);

    if(!runResp){
      throw oThis.getError(`Error deploying build for app: ${options.app}`, 'err_ser_dpl_sp5');
    }

    return runResp;

  },

  // Validate production app config keys with staging app config keys for stable build
  validateAppConfig: async function (options) {
    const oThis = this;
    if(options.verifyAppConfigs && ['production'].includes(oThis.env)){

      let commonParams = {
        platformId: oThis.stack,
        env: oThis.env
      };

      // Get app config data for production
      let acGetServiceObj = new AppConfigGet(commonParams);
      let acGetServiceResp = await acGetServiceObj.perform({
        subEnv: options.subEnv,
        app: options.app
      });

      if(acGetServiceResp.err){
        throw oThis.getError(`Error fetching configurations for app: ${options.app}, env: ${commonParams.env}`, 'err_ser_dpl_vac1');
      }

      let appConfigDataProd = acGetServiceResp['data'][oThis.constants.appConfig.appConfigDataKey];

      // Get app config data for staging
      commonParams['env'] = 'staging';
      acGetServiceObj = new AppConfigGet(commonParams);
      acGetServiceResp = await acGetServiceObj.perform({
        subEnv: options.subEnv,
        app: options.app
      });

      if(acGetServiceResp.err){
        throw oThis.getError(`Error fetching configurations for app: ${options.app}, env: ${commonParams.env}`, 'err_ser_dpl_vac2');
      }

      let appConfigDataStag = acGetServiceResp['data'][oThis.constants.appConfig.appConfigDataKey];

      let appConfigKeysProd = Object.keys(appConfigDataProd);
      let appConfigKeysStag = Object.keys(appConfigDataStag);
      let pendingKeys = appConfigKeysStag.filter(n => !appConfigKeysProd.includes(n));

      if(pendingKeys.length > 0){
        console.log("\nFollowing keys are missing:\n", pendingKeys, "\n");
        throw oThis.getError(`Missing ENV vars in production config for app: ${options.app}`, 'err_ser_dpl_vac3');
      }

    }

    return true;
  }


};

Object.assign(DeployBuild.prototype, servicePrototype);

/**
 * Deploy app build on app servers
 * @module services/ansible/deploy
 */
module.exports = DeployBuild;
