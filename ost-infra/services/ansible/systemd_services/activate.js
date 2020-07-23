'use strict';

const rootPrefix = '../../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , AppEC2InstanceModel = require(rootPrefix + '/models/app_ec2_instances')
  , AnsibleRemoveServices = require(rootPrefix + '/services/ansible/systemd_services/remove')


;

/**
 * Activate systemd services via ansible
 * @class
 */
const AnsibleActivateService = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

AnsibleActivateService.prototype = Object.create(ServiceBase.prototype);
AnsibleActivateService.prototype.constructor = AnsibleActivateService;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_ss_act_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_ss_act_v2');
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
   * @param {string} options.serviceAction - (Optional) Service action (start/restart) to be taken after activation
   * @param {string} options.serviceName - (Optional) Service name to be started/restarted
   * @param {Boolean} options.force - (Optional) perform options.serviceAction forcefully
   * @param {string} options.ipAddresses - (Optional) Comma separated machine IPs
   * @param {string}  options.copyJobsFromIp -(Optional) Copy Jobs from Ip
   *  @param {string} options.chainId - chainId for utility app
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    if (!oThis.constants.isSystemdActivationRequired().includes(options.app))
    {
      console.log("******************************Activate not required for ",options.app);
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
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_as_ss_act_sp0.1');
    }
    let scRespData = scGetServiceResp['data'];
    let  stackCommonData = scRespData[oThis.constants.platform.commonDataKey]
    ;

    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app: options.app,
      plainText: scRespData['plainText'],
      ipAddresses: options.ipAddresses,
      chainId:options.chainId
    });

    if (inventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Invalid inventory data for app: ${options.app}`, 'err_ser_as_ss_act_sp0.2');
    }

    if(options.copyJobsFromIp ) {
      if(options.ipAddresses.length !== 1){
        throw oThis.getError(`copyJobsFromIp given but ipAddresses missing`, 'err_ser_as_ss_act_sp0.3');
      }
      // copy App data from source row to target row

      let appEC2ModelObj = new AppEC2InstanceModel();
      let sourceRowData = (await appEC2ModelObj.getByAppIdStackConfigIdAndIpAddresses(options.app, scRespData['id'], options.copyJobsFromIp))[0];
      if (!sourceRowData) {
        throw oThis.getError(`Invalid source for app-data for app: ${options.app}`, 'err_ser_as_ss_act_sp0.4');
      }
      let targetRowData = inventoryData['ec2Data'][0];
      let toAppData= targetRowData['app_data'];
      if(toAppData['jobs']  && Object.keys(toAppData['jobs']).length>0){
        throw oThis.getError(`app already contains jobs thus quitting `, 'err_ser_as_ss_act_sp0.45');
      }
      let filteredAppData = oThis.Helper.appEC2.mergeAppDataForApp(options.app, JSON.parse(sourceRowData['app_data']),toAppData,['jobs']);

      let appData = targetRowData['app_data'];
      appData = Object.assign(appData, filteredAppData);

      // update db for taget Data
      appEC2ModelObj = new AppEC2InstanceModel();
      let resp =await appEC2ModelObj.updateAppDataById(appData, targetRowData['id']);
      if(!resp){
        throw oThis.getError(`Failure in updating appData`, 'err_ser_as_ss_act_sp0.6');
      }


      //deactivate source ip address as the new machine is ready
      let removeObj = new AnsibleRemoveServices(commonParams);
      let performOptions = {
        subEnv: options.subEnv,
        app: options.app,
        ipAddresses: options.copyJobsFromIp
      };

      let removeResp=await removeObj.perform(performOptions);
      if(removeResp.err || !removeResp.data){
        throw oThis.getError(`Failure in removing jobs`, 'err_ser_as_ss_act_sp0.7');
      }


    }
   // Generate ansible inventory yaml for app
    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      inventoryData: inventoryData,
      chainId: options.chainId
    });

    if(serviceResp.err){
      throw oThis.getError(`Error Generating ansible inventory file for app ${options.app}`, 'err_ser_as_ss_act_sp1');
    }
    let serviceRespData = serviceResp['data'];

    let extraVars = {
      application: options.app,
      remote_task: 'activate_services',
      identifier_req: oThis.constants.identifierReq(options.app),
      serviceAction: options.serviceAction || "",
      serviceName: options.serviceName || "",
      env: oThis.env,
      aws_region : scRespData['awsRegion'],
      devops_s3_bucket: stackCommonData['buildS3Bucket'],
      forceRestart: (options.force ? options.force : ""),
      chainId: options.chainId
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

    let runResp = shellExec.runAppTasks(serviceRespData['file'], extraVars,groupVarsOptions);
    if(!runResp){
      throw oThis.getError(`Ansible activate services failed for app: ${options.app}`, 'err_ser_as_ss_act_sp2');
    }
    return runResp;

  },

};

Object.assign(AnsibleActivateService.prototype, servicePrototype);

/**
 * Activate systemd service via ansible
 * @module services/ansible/systemd_services/activate
 */
module.exports = AnsibleActivateService;
