'use strict';

const rootPrefix = '../..'
  , CreateAppService = require(rootPrefix + '/services/app_setup/_create_app')
  , UpdateAppServerStatusService = require(rootPrefix + '/services/app_setup/update_app_status')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , AppEC2InstanceModel = require(rootPrefix + '/models/app_ec2_instances')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Create server app/cron
 * @class
 */
const CreateServerApp = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

CreateServerApp.prototype = Object.create(ServiceBase.prototype);
CreateServerApp.prototype.constructor = CreateServerApp;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_csa_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_csa_v2');
    }

    await oThis.setStackConfigData(PlatformGet, options.subEnv);

    if(!options.appName || options.appName == ''){
      throw oThis.getError('Invalid appName!', 'err_ser_as_csa_v3');
    }

    if(!oThis.constants.appTypeList().includes(options.appType)){
      throw oThis.getError('Invalid appType!', 'err_ser_as_csa_v4');
    }


    options.volumeSize = options.volumeSize || oThis.constants.ec2DefaultVolumeSize(oThis.env, options.subEnv);
    options.instanceType = options.instanceType || oThis.constants.ec2DefaultInstanceType(oThis.env, options.subEnv);
    oThis.availZoneDetails = await oThis.Helper.appEC2.getNextAvailabilityZoneForEC2Instance(options.app, oThis.stackConfigData['id'], 'app');
    options.availZone = options.availZone || oThis.availZoneDetails['availZone'];

    let appData = oThis.Helper.appEC2.parseAppData(options.app, options.appData);
    if(!appData){
      throw oThis.getError(`Invalid appData for app: ${options.app}!`, 'err_ser_as_csa_v6');
    }
    options.appData = appData;
    options.chainId = options.chainId || '';
    options.appCount = (options.appCount ? parseInt(options.appCount) : 1);

  },

  /**
   * Create Service for app/cron server
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.appType - Purpose of the application server (app or cron)
   * @param {string} options.appName - Application server name
   * @param {string} options.availZone - AWS Availability zone
   * @param {string} options.chainId - Group id if there is any? (in case of utility chain specific machines)
   * @param {string} options.volumeSize - AWS EBS data volume size
   * @param {string} options.instanceType - AWS EC2 instance type
   * @param {string} options.appData - App inventory specific data
   * @param {string} options.appCount - Number of app servers
   * @param {string} options.ec2Status - ec2 expected status
   * @param {string} options.copyAppDataFromIp - IP address from which app data to be copied
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    if(oThis.constants.webAppsForApis().includes(options.app)){
      console.log("********** No need of app_setup for 'web' type interface apps, instead create 'api' type app **********");
      return true;
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

    if(scGetServiceResp.err){
      throw oThis.getError(`Error while fetching stack configs info for app: ${options.app}`, 'err_ser_ca_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    // Get existing app data if nay
    if(options.copyAppDataFromIp){
      let appEC2ModelObj = new AppEC2InstanceModel();
      let rowData = (await appEC2ModelObj.getByAppIdStackConfigIdAndIpAddresses(options.app, scRespData['id'], options.copyAppDataFromIp))[0]
      if(!rowData){
        throw oThis.getError(`Invalid source for app-data for app: ${options.app}`, 'err_ser_ca_sp1.1');
      }

      let appData = oThis.Helper.appEC2.mergeAppDataForApp(options.app, options.appData, JSON.parse(rowData['app_data']));
      // Remove role for now, it will get added later in create app
      delete appData['role'];
      options.appData = appData;
    }

    // Create app/cron server
    let createAppSerObj = new CreateAppService(commonParams);
    let ittrStart = oThis.availZoneDetails['activeCount'] + 1
      , ittrEnd = (ittrStart + options.appCount)
      , serviceRespArr = []
    ;
    let appName = options.appName;
    for(let i=ittrStart;i<ittrEnd;i++){

      options.appName = `${appName} ${i}`;

      console.log("\n***** Create EC2 instance for following parameters *****\n", options, "\n");

      let createAppResp = await createAppSerObj.perform(Object.assign({}, options));

      if(createAppResp.err){
        throw oThis.getError(`Error in EC2 app/cron creation for app: ${options.app}`, 'err_ser_csa_sp1');
      }

      serviceRespArr.push(createAppResp.data);

      // Toggle availability zone for next app
      options.availZone = oThis.Helper.appEC2.toggleAvailZone(options.availZone);
    }

    // Update app server status
    let updateStatusSerObj = new UpdateAppServerStatusService(commonParams)
      , updateStatusSerResp = await updateStatusSerObj.perform({subEnv: options.subEnv, app: options.app, ec2Status: options.ec2Status})
    ;

    return {ec2Instances: serviceRespArr};
  }

};

Object.assign(CreateServerApp.prototype, servicePrototype);

/**
 * Create app/cron server
 * @module services/app_setup/create_server_app
 */
module.exports = CreateServerApp;
