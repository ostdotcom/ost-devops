'use strict';

const rootPrefix = '../..'
  , EC2ServiceStart = require(rootPrefix + '/lib/aws/ec2/start_instance')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , EC2ServiceStatusCheck = require(rootPrefix + '/lib/aws/ec2/status_check')
;

/**
 * Start app server
 * @class
 */
const StartApp = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

StartApp.prototype = Object.create(ServiceBase.prototype);
StartApp.prototype.constructor = StartApp;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_start_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_start_v2');
    }
    //
    // if(options.app === oThis.constants.utilityApp && (!options.chainId)){
    //   throw oThis.getError('Invalid chainId for utility app!', 'err_ser_as_start_v3');
    // }
    //
    // if(options.app === oThis.constants.valueApp && options.chainId != oThis.constants.getOriginChainId(oThis.env,options.subEnv)){
    //   throw oThis.getError('Invalid chainId for value app!', 'err_ser_as_start_v4');
    // }
    options.chainId = options.chainId || '';
    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }

  },

  /**
   * Create Service for app server
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.chainId - Group id if there is any? (in case of utility chain specific machines)
   * @param {string} options.ipAddresses - limit to some ips
   * @returns {Object} Start App status
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
      throw oThis.getError(`Error while fetching stack configs info for app: ${options.app}`, 'err_ser_as_start_sp1');
    }
    oThis.scRespData = scGetServiceResp['data'];

    // Get instance ids map
    let instanceIdsMap = await oThis.Helper.appEC2.getInstanceIds({
      stackConfigId: oThis.scRespData['id'],
      app:  options.app,
      plainText: oThis.scRespData['plainText'],
      chainId:options.chainId,
      ipAddresses: options.ipAddresses,
      status: ["stopped", "active"]

    });

    // Start instance in following order
    let ec2InstanceIds = instanceIdsMap['cronInstanceEc2Ids'].concat(instanceIdsMap['cronPriorityInstanceEc2Ids']).concat(instanceIdsMap['appInstanceEc2Ids']);

    if (ec2InstanceIds.length <1) {
      throw oThis.getError(`Error getting EC2 instance ids for app: ${options.app}`, 'err_ser_as_start_sp2');
    }

    let resp = await oThis.startInstances({
      subEnv:options.subEnv,
      app:options.app,
      instanceIdsMap: instanceIdsMap['instanceIdsMap'],
      instanceIds: ec2InstanceIds
    });

    if(!resp){
      throw oThis.getError(`Error starting cron instances for app: ${options.app}`, 'err_ser_as_start_sp4');
    }

    return resp;
  },

  /**
   * Create Service for app server
   * @function
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.instanceIdsMap - map of instance identifier and instance id
   * @param {string} options.instanceIds -- list of ec2 instance ids
   * @param {string} options.app - application name
   * @returns {Object} Start App status
   */
  startInstances: async function(options){
    const oThis = this;

    let awsConnectionParams = await oThis.getAppInitParams(options.subEnv);
    let ec2ServiceObj =  new EC2ServiceStart(awsConnectionParams);
    let successfulStarts = []
      , instanceIds = options.instanceIds
      , instanceIdsMap = options.instanceIdsMap
    ;

    // Start ec2 instances
    for(let i =0;i<instanceIds.length;i++){
      let instId = instanceIds[i];
      let resp = await ec2ServiceObj.perform({app:options.app, instanceIds:[instId]});
      let awsStatus = null;
      if(resp.data){
        successfulStarts.push(instId);
        awsStatus = resp['data']['StartingInstances'][0]['CurrentState']['Name'];
      }
      // update temp status in DB
      await oThis.Helper.appEC2.updateEc2DataInDB(instId, instanceIdsMap[instId], awsStatus)
    }

    // wait for successful start
    let statusCheckObj = new EC2ServiceStatusCheck(awsConnectionParams)
      , statusCheckResp = await statusCheckObj.perform({
      app: options.app, instanceIds: successfulStarts, checkForState: oThis.constants.waitForEc2RunningStatus
    });

    if(statusCheckResp.err){
      throw oThis.getError(`error when waiting for instances to be started`, 'err_ser_as_start_si2');
    }

    // update final status in DB
    let resp = await oThis.Helper.appEC2.updateEc2StatusAndDataInDB({
      instanceIdsMap: instanceIdsMap,
      awsConnectionParams: awsConnectionParams,
      app: options.app
    });

    if (!resp) {
      throw oThis.getError(`Error in marking DB status as started `, 'err_ser_as_start_si3');
    }

    return resp;
  }
};

Object.assign(StartApp.prototype, servicePrototype);

/**
 * Start apps
 * @module services/app_setup/start_app
 */
module.exports = StartApp;
