'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')



;

/**
 *  Add config to server
 * @class
 */
const AddtoServer = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

AddtoServer.prototype = Object.create(ServiceBase.prototype);
AddtoServer.prototype.constructor = AddtoServer;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;
    if(!options.targetPlatformId){
      throw 'Invalid platform identifier!';
    }

    if(!oThis.constants.appList().includes(options.targetApp)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_acs_v1');
    }
    if(options.targetApp === oThis.constants.utilityApp && !(options.targetChainId) ){
      throw oThis.getError('ChainId is compulsory for utility app ', 'err_ser_acs_v2');
    }
    if(!oThis.constants.subEnvList().includes(options.targetSubEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_acs_v3');
    }
    oThis.infraWorkspacePath = oThis.constants.infraWorkspacePath();

    let initParams = await oThis.getAppInitParams(oThis.constants.ostInfraSubEnv());
    oThis.shellExec = new ShellExecKlass(initParams);

  },

  /**
   * Add client to server
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.targetSubEnv - Sub environment name
   * @param {string} options.targetApp - Application identifier
   * @param {string} options.targetIpAddresses - ipaddress whose config to add
   * @param {string} options.targetPlatformId - targetPlatformID
   * @param {string} options.targetChainId  - ChainId for utility and rabbit app
   * @param {string} options.targetEnv - Target Environment
   *  @param {string} options.serviceAction  --stop or start or restart
   * @param {string} options.ipAddresses
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    const targetCommonParams = {
      platformId: options.targetPlatformId,
      env: options.targetEnv
    };

    let scGetServiceObj = new PlatformGet(targetCommonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.targetSubEnv
    });

    if(scGetServiceResp.err){
      throw oThis.getError(`Error fetching stack configurations for target app: ${options.targetApp}`, 'err_ser_nuc_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      plainText: scRespData['plainText'],
      app: options.targetApp,
      ipAddresses: options.targetIpAddresses,
      chainId: options.targetChainId
    });



    let filesToDelete = [];
    let fileOpsObj = new FileOps();
    // Extra vars for nagios task
    let extraVars = {
      monitoring_task: "add_client_config"
    };
    if (inventoryData['ec2Data'].length > 0) {
      let extraData = {
        targetPlatformId: options.targetPlatformId,
        env: options.targetEnv,
        targetSubEnv: options.targetSubEnv,
        targetApp: options.targetApp,
        task:"add_client_config",
        targetChainId: options.targetChainId,
        appIps: [],
        cronIps: []
      };

      for( let i=0;i<inventoryData['ec2Data'].length;i++) {

        let ec2Data = inventoryData['ec2Data'][i];
        if (ec2Data['app_data']['nagios_server']) {
          continue;
        }
        if (ec2Data['app_data']['role'] === "cron" ){
          extraData['cronIps'].push(ec2Data['ip_address']);
        }
        else{
          extraData['appIps'].push(ec2Data['ip_address']);
        }
      }

      let appSpecificConfigs=await oThis.Helper.ansible.getAppSpecificConfigsForSetup({
        stackConfigs: scRespData,
        app: oThis.constants.stackApp,
        extraData: extraData
      });

      let filesData = appSpecificConfigs['filesData'];
      let fileResp = await fileOpsObj.generateAppSpecificSetupFiles(filesData,oThis.infraWorkspacePath);
      Object.assign(extraVars, fileResp);
      filesToDelete = filesToDelete.concat(Object.values(fileResp));
    }


    if(options.serviceAction){
      extraVars['service_action'] = oThis.constants.ansibleSystemdState(options.serviceAction);
    }

    const stackCommonParams = {
      platformId: oThis.constants.ostInfraPlatform(),
      env: oThis.constants.ostInfraEnv(options.targetEnv)
    };

    let stackScGetServiceObj = new PlatformGet(stackCommonParams);
    let stackScGetServiceResp = await stackScGetServiceObj.perform({
      subEnv: oThis.constants.ostInfraSubEnv()
    });

    if(stackScGetServiceResp.err){
      throw oThis.getError(`Error fetching stack configurations for app: ${oThis.stackApp}`, 'err_ser_nuc_sp1');
    }
    let stackScRespData = stackScGetServiceResp['data'];

    let stackInventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: stackScRespData['id'],
      app: oThis.constants.stackApp,
      plainText: stackScRespData['plainText'],
    });

    if (stackInventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Invalid inventory data for app-setup for app: ${oThis.stackApp}`, 'err_ser_nuc_sp2.1');
    }

    let filteredInventoryData=await oThis.Helper.appEC2.filterNagiosServer({ec2Data: stackInventoryData['ec2Data']});
    if (filteredInventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Error getting filteredInventoryData`, 'err_ser_nuc_sp2.2');
    }

    // Generate ansible inventory yaml for app
    let ansibleInvObj = new GenerateAnsibleInventory(stackCommonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: oThis.constants.ostInfraSubEnv(),
      app: oThis.constants.stackApp,
      inventoryData: filteredInventoryData
    });

    if (serviceResp.err) {
      throw oThis.getError(`Error generating ansible inventory yaml for app: ${oThis.stackApp}`, 'err_ser_nuc_sp4');
    }
    let serviceRespData = serviceResp['data'];

    // Run ansible playbook for monitoring tasks
    let shellExec = new ShellExecKlass();
    let runResp = shellExec.runNagiostasks(serviceRespData['file'], extraVars, options.ipAddresses);
    if (!runResp) {
      throw oThis.getError('ansible monitoring task failed ', 'err_ser_nuc_sp5');
    }

    // Remove locally generated setup files
    await fileOpsObj.removeLocalFiles(filesToDelete);

    return runResp;

   }
};

Object.assign(AddtoServer.prototype, servicePrototype);

/**
 * Add config to server
 * @module services/nagios/add_to_server
 */
module.exports = AddtoServer;
