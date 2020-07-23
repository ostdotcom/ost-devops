'use strict';

const rootPrefix = '../../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , PlatformGet = require(rootPrefix + '/services/platform/get')

;

/**
 * Deactivate systemd services via ansible
 * @class
 */
const AnsibleDeActivateService = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

AnsibleDeActivateService.prototype = Object.create(ServiceBase.prototype);
AnsibleDeActivateService.prototype.constructor = AnsibleDeActivateService;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_ss_dact_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_ss_dact_v2');
    }

    if(options.cronJobs){
      options.cronJobs = options.cronJobs.split(',').map(str => str.trim());
    }
    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }
  },

  /**
   * Activate systemd services parameters
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @param {string} options.chainId - chainId
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    if (!oThis.constants.isSystemdActivationRequired().includes(options.app))
    {
      console.log("******************************Deactivate not required for ",options.app);
      return true ;
    }
    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };
    // Get Stack config data
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if(scGetServiceResp.err || !scGetServiceResp.data){
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_as_ss_dact_sp1.0');
    }
    let scRespData = scGetServiceResp['data'];

    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app: options.app,
      plainText: scRespData['plainText'],
      ipAddresses: options.ipAddresses,
      chainId:options.chainId
    });
    if (inventoryData['ec2Data'].length < 1) {
      console.log("******************************Deactivate not required as no active ip **************************** ");
      return true;
    }
    // Generate ansible inventory yaml for app
    if(options.cronJobs){
      inventoryData=await oThis.Helper.ansible.filterInventoryDataByCrons(inventoryData,options.cronJobs);
    }
    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      inventoryData:inventoryData
    });
    if(serviceResp.err){
      throw oThis.getError(`Error Generating ansible inventory file for app ${options.app}`, 'err_ser_as_ss_dact_sp1.2');
    }
    let serviceRespData = serviceResp['data'];

    let extraVars = {
      application: options.app,
      identifier_req: oThis.constants.identifierReq(options.app),
      remote_task: 'deactivate_services'
    };

    // Run ansible command/script
    let initParams = await oThis.getAppInitParams(options.subEnv)
      , shellExec = new ShellExecKlass(initParams)
    ;
    let groupVarsOptions={
      env: oThis.env,
      stack:oThis.stack,
      ips:options.ipAddresses
    };
    let runResp = shellExec.runAppTasks(serviceRespData['file'], extraVars, groupVarsOptions);
    if(!runResp){
      throw oThis.getError(`Ansible deactivate services failed for app: ${options.app}`, 'err_ser_as_ss_dact_sp2');
    }
    return runResp;

  },

};

Object.assign(AnsibleDeActivateService.prototype, servicePrototype);

/**
 * deactivate systemd service via ansible
 * @module services/ansible/systemd_services/deactivate
 */
module.exports = AnsibleDeActivateService;
