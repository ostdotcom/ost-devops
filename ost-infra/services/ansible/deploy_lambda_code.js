'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , AppConfigsHelper = require(rootPrefix + '/helpers/app_configs')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Deploy lambda code for app
 * @class
 */
const DeployLambdaCode = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

DeployLambdaCode.prototype = Object.create(ServiceBase.prototype);
DeployLambdaCode.prototype.constructor = DeployLambdaCode;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(options.app !== oThis.constants.saasApiApp){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_dlc_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_dlc_v2');
    }

    if(!options.chainId){
      throw oThis.getError('Invalid chainId!', 'err_ser_as_dlc_v3');
    }

    let initParams = await oThis.getAppInitParams(options.subEnv);
    oThis.shellExec = new ShellExecKlass(initParams);

    options.copyDeployExecs = options.copyDeployExecs || false;

    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }



  },

  /**
   * Deploy app build on app servers
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {boolean} options.copyDeployExecs - Whether to Copy deploy executable files or not
   * @param {string} options.chainId - Chain Id
   * @param {string} options.ipAddresses - Comma separated machine IPs
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
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_as_dlc_sp1');
    }
    let scRespData = scGetServiceResp['data']
    ;

    let awsRegion = scRespData['awsRegion']
      , awsAccountId = scRespData['awsAccountId']
      , s3Bucket = oThis.constants.lambdaCodeS3Bucket(oThis.env)
      , s3ZipFilePath = oThis.constants.lambdaCodeS3FilePath(oThis.stack, oThis.env, options.subEnv, options.chainId)
      , lambdaFunctionName = `${oThis.constants.lambdaFunctionNameForDDBToES(oThis.stack, oThis.env, options.subEnv, options.app, options.chainId)}`
      , lambdaFunctionArn = `${oThis.constants.lambdaFunctionARN(awsRegion, awsAccountId)}:${lambdaFunctionName}`
    ;

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_as_dlc_sp2');
    }

    // Generate and Get lambda code configs file from app configs
    let fileName = lambdaFunctionName;
    let appConfigsHelperObj = new AppConfigsHelper();
    let configFile = await appConfigsHelperObj.generateConfigFileForLambdaCode({
      appConfigs: acGetServiceResp['data'],
      fileName: fileName,
      chainId: options.chainId
    });

    if(!configFile){
      throw oThis.getError(`Error generating Config file for lambda code for app: ${options.app}`, 'err_ser_as_dlc_sp3');
    }

    // Generate ansible inventory yaml for deployment
    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app: options.app,
      ipAddresses: options.ipAddresses
    });

    let hostToRun = inventoryData['ec2Data'][0]
      , ipAddress = hostToRun['ip_address']
    ;

    console.log("ipAddress: ", ipAddress);

    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      lightInventory: true,
      inventoryData: inventoryData
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml for app: ${options.app}`, 'err_ser_as_dlc_sp4');
    }
    let serviceRespData = serviceResp['data'];

    let extraVars = {
      remote_task: 'deploy_lambda_code',
      application: options.app,
      region: awsRegion,
      lambda_function_arn: lambdaFunctionArn,
      s3_bucket: s3Bucket,
      s3_zip_file_path: s3ZipFilePath,
      local_config_file: configFile,
      lambda_config_file_name: `${fileName}.json`,
      copy_execs: options.copyDeployExecs
    };
    let groupVarsOptions={
      env: oThis.env,
      stack:oThis.stack,
      ips:ipAddress
    };
    let runResp = await oThis.shellExec.runAppTasks(serviceRespData['file'], extraVars,groupVarsOptions);

    // Remove local config file
    await new FileOps().removeFile(configFile);

    if(!runResp){
      throw oThis.getError(`Error deploying Lambda code for app: ${options.app}`, 'err_ser_as_dlc_sp5');
    }

    return runResp;
  },

};

Object.assign(DeployLambdaCode.prototype, servicePrototype);

/**
 * Deploy lambda code for app
 * @module services/ansible/deploy_lambda_code
 */
module.exports = DeployLambdaCode;
