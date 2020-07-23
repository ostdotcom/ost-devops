'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Deploy nginx for app
 * @class
 */
const DeployNginx = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

DeployNginx.prototype = Object.create(ServiceBase.prototype);
DeployNginx.prototype.constructor = DeployNginx;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_dnx_v1');
    }

    if(!options.serviceAction){
      throw oThis.getError('Invalid serviceAction!', 'err_ser_as_dnx_v2');
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
   * @param {string} options.ipAddresses - Ip addresses on which to run
   * @param {string} options.serviceAction - restart stop start services
   * @param {string} options.force - Force apply changes
   * @param {string} options.chainId - chainId
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };
    // Get Stack config data
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if(scGetServiceResp.err){
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_as_dnx_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_as_dnx_sp2');
    }
    let acRespData = acGetServiceResp['data']
      , opsCommonConfigs = acRespData[oThis.constants.appConfig.opsConfigDataKey]
    ;

    let stackCommonData = scRespData[oThis.constants.platform.commonDataKey]
      , stackData = scRespData[oThis.constants.platform.stackDataKey]
    ;

    // Generate ansible inventory yaml for app
    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app:  options.app,
      plainText: scRespData['plainText'],
      ipAddresses: options.ipAddresses
    });
    if (inventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Error getting inventorydata`, 'err_ser_as_dnx_sp3');
    }

    let filteredInventoryData=await oThis.Helper.appEC2.filterByRole({ec2Data: inventoryData['ec2Data'],role: "app"});
    if (filteredInventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Error getting filteredInventoryData`, 'err_ser_as_dnx_sp4');
    }

    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app:  options.app,
      inventoryData: filteredInventoryData,
      chainId:options.chainId
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml`, 'err_ser_as_dnx_sp5');
    }

    let serviceRespData = serviceResp['data'];
    if (oThis.constants.subDomainCheck(options.app) && !opsCommonConfigs['subDomain']){
      throw oThis.getError(`Error subDomain is missing `, 'err_ser_as_dnx_sp6');
    }
    let extraVars = {
      "remote_task": 'update_nginx_service',
      "domain": stackCommonData['domain'],
      "sub_domain": opsCommonConfigs['subDomain'],
      "env": oThis.env,
      "application": options.app,
      "sub_env":options.subEnv,
      "platform": oThis.stack,
      "serviceAction": options.serviceAction,
      "devops_s3_bucket": stackCommonData['buildS3Bucket'],
      "serviceName": "",
      "forceRestart": (options.force ? options.force : "")
    };

    if(stackData['basicAuth']['user'] && stackData['basicAuth']['password']){
      Object.assign(extraVars, {"basic_auth_user": stackData['basicAuth']['user'], "basic_auth_password": stackData['basicAuth']['password']});
    }

    let groupVarsOptions={
      env: oThis.env,
      stack:oThis.stack,
      ips:options.ipAddresses
    };
    let runResp = await oThis.shellExec.runAppTasks(serviceRespData['file'], extraVars,groupVarsOptions);

    if(!runResp){
      throw oThis.getError(`Error deploying nginx code for app: ${options.app}`, 'err_ser_as_dnx_sp7');
    }

    return runResp;
  },

};

Object.assign(DeployNginx.prototype, servicePrototype);

/**
 * Deploy nginx conf
 * @module services/ansible/deploy_nginx_services
 */
module.exports = DeployNginx;
