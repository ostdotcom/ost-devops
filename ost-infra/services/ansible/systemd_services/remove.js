'use strict';

const rootPrefix = '../../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , AppEC2InstanceModel = require(rootPrefix + '/models/app_ec2_instances')


;

/**
 * Remove systemd services via ansible
 * @class
 */
const AnsibleRemoveService = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

AnsibleRemoveService.prototype = Object.create(ServiceBase.prototype);
AnsibleRemoveService.prototype.constructor = AnsibleRemoveService;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_ss_rm_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_ss_rm_v2');
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
   * @param {string} options.cronJobs - cronJobs Array
   * @param {boolean} options.removeCronJobs -- true or false
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    if (!oThis.constants.isSystemdActivationRequired().includes(options.app))
    {
      console.log("******************************Remove not required for ",options.app);
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
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_as_ss_rm_sp1.0');
    }
    let scRespData = scGetServiceResp['data'];

    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app: options.app,
      plainText: scRespData['plainText'],
      ipAddresses: options.ipAddresses
    });
    if (inventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Error getting ips ${options.app}`, 'err_ser_as_ss_rm_sp1.01');
    }

    if(options.cronJobs){
      inventoryData=await oThis.Helper.ansible.filterInventoryDataByCrons(inventoryData,options.cronJobs);
    }
    if(inventoryData['ec2Data'].length>0){
      // Generate ansible inventory yaml for app
      let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
      let serviceResp = await ansibleInvObj.perform({
        subEnv: options.subEnv,
        app: options.app,
        inventoryData:inventoryData
      });

      if(serviceResp.err){
        throw oThis.getError(`Error Generating ansible inventory file for app ${options.app}`, 'err_ser_as_ss_rm_sp1');
      }
      let serviceRespData = serviceResp['data'];

      let extraVars = {
        application: options.app,
        identifier_req: oThis.constants.identifierReq(options.app),
        remote_task: 'remove_services',
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
        throw oThis.getError(`Ansible remove services failed for app: ${options.app}`, 'err_ser_as_ss_rm_sp2');
      }
    }
    if (!options.removeCronJobs){
      return true;
    }

    for(let i=0;i<inventoryData['ec2Data'].length;i++){
      let rowData=inventoryData['ec2Data'][i];
      let rowAppData=rowData['app_data'];
      if(options.cronJobs){
        rowAppData['jobs']=rowAppData['jobs'].filter( function( el ) {
          return !options.cronJobs.includes( el );
        } );
      }
      else{
        rowAppData['jobs']=[];
      }
      let appEC2ModelObj = new AppEC2InstanceModel();
      let removeAppDataResp =await appEC2ModelObj.updateAppDataById(rowAppData, rowData['id']);
      if(!removeAppDataResp){
        console.log("rowData that was being updated:::",rowData);
        throw oThis.getError(`Failure in updating appData`, 'err_ser_as_ss_rm_sp3');
      }
    }
    return true;

  }


};

Object.assign(AnsibleRemoveService.prototype, servicePrototype);

/**
 * Remove systemd service via ansible
 * @module services/ansible/systemd_services/remove
 */
module.exports = AnsibleRemoveService;
