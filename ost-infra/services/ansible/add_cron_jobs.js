'use strict';

const rootPrefix = '../..'
  , AppEC2InstanceModel = require(rootPrefix + '/models/app_ec2_instances')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Create cron job entry in app cron tables
 * @class
 */
const AddCronJobs = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

AddCronJobs.prototype = Object.create(ServiceBase.prototype);
AddCronJobs.prototype.constructor = AddCronJobs;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_acj_v1');
    }

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_acj_v2');
    }

    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }

    if(options.cronJobs && (!options.ipAddresses || options.ipAddresses.length < 1)){
      throw oThis.getError('ipAddresses missing for add cron jobs (cronJobs)!', 'err_ser_as_acj_v3');
    }

  },

  /**
   * Add cron jobs for App
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - application name
   * @param {string} options.buildNumber -- Build number
   * @param {string} options.cronJobs -- Comma separated Cron job identifiers
   * @param {string} options.ipAddresses - Comma separated machine IPs for which jobs need to collected
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
      throw oThis.getError(`Error while fetching stack configs info for app: ${options.app}`, 'err_ser_as_acj_sp1');
    }
    let scRespData = scGetServiceResp['data']
      , stackCommonData = scRespData[oThis.constants.platform.commonDataKey]
      , ansibleData = stackCommonData['ansible'] || {}
    ;

    // Append new cron jobs
    if(options.cronJobs){
      console.log(`*** Adding new cron entries for following jobs: "${options.cronJobs}" ***`);
      let addStatus = await oThis.Helper.appEC2.appendCronJobsToAppData({
        cronJobs: options.cronJobs,
        ipAddresses: options.ipAddresses,
        app: options.app,
        stackConfigId: scRespData['id']
      });

      if(!addStatus){
        throw oThis.getError(`Error while appending new cron job for app: ${options.app}`, 'err_ser_as_acj_sp1.1');
      }
    }

    if(!oThis.constants.isCronEntryRequiredOnRemoteApp(options.app)){
      console.log(`\n\n ***** Cron entry on remote server is not required for app: ${options.app} ***** \n\n`);
      return true;
    }

    let appEc2Data = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app: app,
      ipAddresses: options.ipAddresses
    });

    let inventoryData = appEc2Data['ec2Data'];

    if(inventoryData.length < 1){
      throw oThis.getError(`Inventory data not present for app: ${options.app}`, 'err_ser_as_acj_sp2');
    }

    // Generate inventory data
    let inventoryAddresses = oThis.Helper.ansible.generateInventoryData({
      env: oThis.env,
      subEnv: options.subEnv,
      app: app,
      inventoryData: inventoryData,
      uniqueRunId: oThis.uniqueRunId
    });
    if(Object.keys(inventoryAddresses).length<1){
      throw oThis.getError('inventoryAddresses is empty  !', 'err_ser_as_acj_sp2.1');
    }

    // Merge inventories generated for different ips under single ip to execute job
    let executorInventoryIp = null
      , executorInventoryData = null
      , inventoryJobsData = []
    ;

    for(let key in inventoryAddresses){
      let ele = inventoryAddresses[key];
      if(ele.hasOwnProperty('jobs')){
        inventoryJobsData = inventoryJobsData.concat(ele['jobs']);
      }
      executorInventoryIp = key;
      executorInventoryData = ele;
    }

    if(inventoryJobsData.length < 1){
      console.log(`\n\n ***** No Cron jobs present for app: ${options.app} ***** \n\n`);
      return true;
    }

    let finalInventroyData = {};
    Object.assign(executorInventoryData, {jobs: inventoryJobsData});
    finalInventroyData[executorInventoryIp] = executorInventoryData;

    let inventoryJson = oThis.Helper.ansible.baseInventoryHierarchy(
      options.subEnv, app, finalInventroyData
    );

    let dirPath = oThis.constants.ansibleInventoryFilePath(oThis.stack, oThis.env)
      , filename = oThis.constants.appExecutorFileName(app, oThis.uniqueRunId)
      , task = 'create_cron_entry'
      , fileOpsObj = new FileOps()
    ;

    // Get yaml data from json
    let yamlResp = fileOpsObj.jsonToYaml(inventoryJson);
    let inventoryFile = await fileOpsObj.createFileForPath(dirPath, filename, 'yml', yamlResp);

    if(!inventoryFile){
      throw oThis.getError(`Error generating YAML file for saas executor`, 'err_ser_as_acj_sp3');
    }

    // Run ansible task
    let execPath = options.buildNumber ?
      oThis.constants.ansible.releasePath(options.app, options.buildNumber, ansibleData['profileType']) :
      oThis.constants.ansible.currentPath(options.app, ansibleData['profileType'])
    ;
    let extraVars = {
      remote_task: task,
      exec_path: execPath,
      application:options.app,
      buildNumber:options.buildNumber ? true : false,
      data_key: 'jobs'
    };
    let groupVarsOptions={
      env: oThis.env,
      stack:oThis.stack,
      ips:options.ipAddresses
    };
    let execObj = new ShellExecKlass();
    let execResp = execObj.runAppTasks(inventoryFile, extraVars,groupVarsOptions);
    // let execResp = true;
    if(!execResp){
      throw oThis.getError(`Error executing ansible play for task`, 'err_ser_as_acj_sp4');
    }

    // Read out put file returned from remote machine
    let readFromIps = Object.keys(finalInventroyData);

    await oThis.updateCronJobDataInDB(finalInventroyData, app, scRespData['id']);

    return true;

  },

  updateCronJobDataInDB: async function (inventroyData, app, stackConfigId) {
    const oThis = this;

    for(let invIp in inventroyData){
      let invData = inventroyData[invIp];
      let localOutFile = invData['local_outfile'];

      let outputData = require(localOutFile);
      let jobsData = {};

      for(let j=0;j<outputData.length;j++){

        let job = outputData[j];
        let jobName = job['name']
          , ipAddress = job['ip_address']
          , identifier = parseInt(job['identifier'])
        ;
        jobsData[ipAddress] = jobsData[ipAddress] || {};
        jobsData[ipAddress]['jobs'] = jobsData[ipAddress]['jobs'] || [];
        jobsData[ipAddress]['jobs'].push({name: jobName, identifier: identifier});
      }

      for(let ipA in jobsData){
        let ipJobs = jobsData[ipA]['jobs'];

        // Get cron jobs data from DB
        let appEC2ModelObj = new AppEC2InstanceModel();
        let rowData = (await appEC2ModelObj.getByAppIdStackConfigIdAndIpAddresses(app, stackConfigId, ipA))[0];

        if(!rowData){
          console.log('\ninventroyData: \n', JSON.stringify(inventroyData), '\n');
          throw oThis.getError(`No active entry exists in DB for ip: ${ipA}`, 'err_ser_as_acj_ucjd1');
        }

        let appData = JSON.parse(rowData['app_data']);
        appData['jobs'] = ipJobs;

        // Update App jobs data for ip
        appEC2ModelObj = new AppEC2InstanceModel();
        let updateResp = await appEC2ModelObj.updateAppDataById(appData, rowData['id']);
        if(updateResp && updateResp['affectedRows'] < 1){
          console.log('\ninventroyData: \n', JSON.stringify(inventroyData), '\n');
          throw oThis.getError(`DB update failed for jobs data for ip: ${ipA}`, 'err_ser_as_acj_ucjd2');
        }

      }

    }

    return true;
  }

};

Object.assign(AddCronJobs.prototype, servicePrototype);

/**
 * Add cron jobs for saas-api
 * @module services/saas_tasks/add_cron_jobs
 */
module.exports = AddCronJobs;
