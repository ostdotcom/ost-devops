'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Deploy Logrotate for app
 * @class
 */
const DeployLogrotate = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

DeployLogrotate.prototype = Object.create(ServiceBase.prototype);
DeployLogrotate.prototype.constructor = DeployLogrotate;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_dlr_v1');
    }

    let initParams = await oThis.getAppInitParams(options.subEnv);
    oThis.shellExec = new ShellExecKlass(initParams);


  },

  /**
   * Deploy app build on app servers
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.chainId -chainId
   * @param {string} options.ipAddresses - Ip addresses on which to run
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
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_as_dlr_sp1');
    }
    oThis.stackData = scGetServiceResp['data'];
    let stackCommonData= oThis.stackData[oThis.constants.platform.commonDataKey]
      , ansibleData = stackCommonData['ansible'] || {}
    ;
    if(!stackCommonData['logsS3Bucket']){
      throw oThis.getError(`logsS3Bucket not present in platform config`, 'err_ser_as_dlr_sp2');
    }

    // Generate ansible inventory yaml for app
    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: oThis.stackData['id'],
      app:  options.app,
      chainId: options.chainId,
      plainText: oThis.stackData['plainText'],
      ipAddresses: options.ipAddresses
    });


    if (inventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Error getting inventorydata`, 'err_ser_as_dlr_sp3');

    }

    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app:  options.app,
      chainId: options.chainId,
      inventoryData: inventoryData
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml`, 'err_ser_as_dlr_sp4');
    }

    let serviceRespData = serviceResp['data'];

    let extraVars = {
      "remote_task": 'update_logrotate',
      "s3_bucket_logs": 's3://'+ stackCommonData['logsS3Bucket'],
      "env": oThis.env,
      "application": options.app,
      "sub_env":options.subEnv,
      "logsDirPath": oThis.constants.logDirPaths(options.app,ansibleData['profileType']),
      "platform": oThis.stack
    };
    let groupVarsOptions={
      env: oThis.env,
      stack:oThis.stack,
      ips:options.ipAddresses
    };
    let runResp = await oThis.shellExec.runAppTasks(serviceRespData['file'], extraVars,groupVarsOptions);

    if(!runResp){
      throw oThis.getError(`Error deploying Lambda code for app: ${options.app}`, 'err_ser_as_dlr_sp5');
    }

    return runResp;
  },

};

Object.assign(DeployLogrotate.prototype, servicePrototype);

/**
 * Deploy lambda code for app
 * @module services/ansible/deploy_lambda_code
 */
module.exports = DeployLogrotate;
