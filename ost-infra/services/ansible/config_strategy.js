'use strict';

const rootPrefix = '../..'
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Create config strategy entry in configs table
 * @class
 */
const AddConfigStrategy = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

AddConfigStrategy.prototype = Object.create(ServiceBase.prototype);
AddConfigStrategy.prototype.constructor = AddConfigStrategy;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_acs_v1');
    }

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_acs_v2');
    }
    if(!oThis.constants.isConfigStrategyRequired().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_acs_v3');
    }
    if(!options.buildNumber){
      throw oThis.getError('Invalid build  number!', 'err_ser_as_acs_v4');
    }
    let initParams = await oThis.getAppInitParams(options.subEnv);
    oThis.shellExec = new ShellExecKlass(initParams);
    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }



  },

  /**
   * Add config strategy jobs for App
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - application name
   * @param {string} options.buildNumber -- Build number
   * @param {string} options.kind  - kind to be inserted
   * @param {string} options.task  -- task to be performed on config strategy
   * @param {string} options.flushOptions  -- options.flushOptions
   * @param {string} options.activate  - kind to be inserted

   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    let app = options.app;
    // Get Stack config data
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if(scGetServiceResp.err || !scGetServiceResp.data){
      throw oThis.getError(`Error while fetching stack configs info for app: ${options.app}`, 'err_ser_as_acs_sp1');
    }
    let scRespData = scGetServiceResp['data']
      , stackCommonData = scRespData[oThis.constants.platform.commonDataKey]
      , ansibleData = stackCommonData['ansible'] || {}
    ;

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_as_acs_sp2');
    }
    let acRespData = acGetServiceResp['data']
      , opsCommonConfigs = acRespData[oThis.constants.appConfig.opsConfigDataKey]
    ;
    let configStrategy=opsCommonConfigs[oThis.constants.configStrategyKey];
    if(options.kind){
      let kindArr=options.kind.split(',');
      for(let i=0;i<kindArr.length;i++){
        if(! configStrategy['config'][kindArr[i]]){
          throw oThis.getError(`Error config strategy for kind doesnt exist in ops config : ${options.kind}`, 'err_ser_as_acs_sp3');
        }
      }
    }
    let fileOpsObj = new FileOps();
    let fileName=oThis.constants.configStrategyFileName(options.app);
    let fileCreateResp = await fileOpsObj.createFileForPath(oThis.constants.infraWorkspacePath(), fileName, 'json',configStrategy);
    if(!fileCreateResp){
      throw oThis.getError(`error creating config strategy file `, 'err_ser_as_acs_sp4');
    }
    // Run ansible task
    let execPath = oThis.constants.ansible.releasePath(options.app, options.buildNumber, ansibleData['profileType']);
    let kindOptions="";
    if (options.kind){
       kindOptions=`--kind ${options.kind}`;
    }
    let extraVars={
      application:options.app,
      configStrategy_file: `${oThis.constants.infraWorkspacePath()}/${fileName}`,
      exec_path:execPath,
      kindOptions:`'${kindOptions}'`,
      remote_task: options.task,
      activate: options.activate||''
    };

    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app: options.app
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
      throw oThis.getError(`Error generating ansible inventory yaml for app: ${options.app}`, 'err_ser_as_acs_sp5');
    }
    let serviceRespData = serviceResp['data'];


    let groupVarsOptions={
      env: oThis.env,
      stack:oThis.stack,
      ips:ipAddress
    };
    let runResp = await oThis.shellExec.runAppTasks(serviceRespData['file'], extraVars,groupVarsOptions);
    if(!runResp){
      throw oThis.getError(`Error generating ansible inventory yaml for app: ${options.app}`, 'err_ser_as_acs_sp6');
    }
    if(options.task !== 'update_config_strategy' ){
      return true ;
    }
    extraVars = {
      env: oThis.env,
      application:options.app,
      apply_on_hosts:options.subEnv,
      flushOptions: `\\"${options.flushOptions}\\"`,
      serviceName: "",
      forceRestart:"",
      serviceAction: "restart",
    };

    let restartResp = await oThis.shellExec.runRestart(serviceRespData['file'],extraVars);

    if(!restartResp){
      throw oThis.getError(`Error while restart for app: ${options.app}`, 'err_ser_as_acs_sp7');
    }

    return true;

  }

};

Object.assign(AddConfigStrategy.prototype, servicePrototype);

/**
 * Add cron jobs for saas-api
 * @module services/saas_tasks/add_config_strategy
 */
module.exports = AddConfigStrategy;
