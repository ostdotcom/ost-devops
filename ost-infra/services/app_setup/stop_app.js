'use strict';

const rootPrefix = '../..'
  , EC2ServiceStop = require(rootPrefix + '/lib/aws/ec2/stop_instance')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , EC2ServiceStatusCheck = require(rootPrefix + '/lib/aws/ec2/status_check')
  , RunLogrotate= require(rootPrefix+ '/services/ansible/run_logrotate.js')

;

/**
 * Stops app server
 * @class
 */
const StopApp = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

StopApp.prototype = Object.create(ServiceBase.prototype);
StopApp.prototype.constructor = StopApp;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_stop_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_stop_v2');
    }

    // if(options.app === oThis.constants.utilityApp && (!options.chainId)){
    //   throw oThis.getError('Invalid chainId for utility app!', 'err_ser_as_stop_v3');
    // }
    //
    // if(options.app === oThis.constants.valueApp && options.chainId != oThis.constants.getOriginChainId(oThis.env,options.subEnv)){
    //   throw oThis.getError('Invalid chainId for value app!', 'err_ser_as_stop_v4');
    // }
    if(options.env === 'production'){
      throw oThis.getError('Stop not allowed on production env ', 'err_ser_as_stop_v3');
    }
    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }

    options.chainId = options.chainId || '';
  },

  /**
   * Create Service for app server
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.chainId - Group id if there is any? (in case of utility chain specific machines)
   * @param {string} options.ipAddresses - limit to some ips
   * @returns {Object} Stop App status
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
      throw oThis.getError(`Error while fetching stack configs info for app: ${options.app}`, 'err_ser_as_stop_sp1');
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

    // Stop instance in following order
    let ec2InstanceIds = instanceIdsMap['appInstanceEc2Ids'].concat(instanceIdsMap['cronPriorityInstanceEc2Ids']).concat(instanceIdsMap['cronInstanceEc2Ids']);

    if (ec2InstanceIds.length <1) {
      throw oThis.getError(`Error getting EC2 instance ids for app: ${options.app}`, 'err_ser_as_stop_sp2');
    }

    let performerObj = new RunLogrotate({
        platformId: oThis.stack,
        env: oThis.env
    });
    let activeGroupIds = instanceIdsMap['activeGroupIds'];
    for (let i=0;i<activeGroupIds.length;i++){
      let groupId = activeGroupIds[i];
      let performOptions = {
        ipAddresses: options.ipAddresses,
        subEnv: options.subEnv,
        app: options.app,
        chainId: groupId
      };

      let logrotateResp = await performerObj.perform(performOptions);
      if(logrotateResp.err){
        throw oThis.getError(`logrotate failed on some machines for group id: ${groupId}`, 'err_ser_as_stop_sp2.1');
      }

    }

    let resp = await oThis.stopInstances({
      subEnv: options.subEnv,
      app: options.app,
      instanceIdsMap: instanceIdsMap['instanceIdsMap'],
      instanceIds: ec2InstanceIds
    });

    if(!resp){
      throw oThis.getError(`Error stopping app instances for app: ${options.app}`, 'err_ser_as_stop_sp3');
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
   * @returns {Object} Stop App status
   */
  stopInstances: async function(options){
    const oThis = this;

    let awsConnectionParams = await oThis.getAppInitParams(options.subEnv);
    let ec2ServiceObj =  new EC2ServiceStop(awsConnectionParams);
    let successfulStops = []
      , instanceIds = options.instanceIds
      , instanceIdsMap = options.instanceIdsMap
    ;

    // Stop ec2 instances
    for(let i =0;i<instanceIds.length;i++){
      let instId = instanceIds[i];
      let stopResp = await ec2ServiceObj.perform({app:options.app, instanceIds:[instId]});
      let awsStatus = null;
      if(stopResp.data){
        successfulStops.push(instId);
        awsStatus = stopResp['data']['StoppingInstances'][0]['CurrentState']['Name'];
      }
      // update temp status in DB
      await oThis.Helper.appEC2.updateEc2DataInDB(instId, instanceIdsMap[instId], awsStatus)
    }

    // wait for successful stops
    let statusCheckObj = new EC2ServiceStatusCheck(awsConnectionParams)
      , statusCheckResp = await statusCheckObj.perform({
      app: options.app, instanceIds: successfulStops, checkForState: oThis.constants.waitForEc2StoppedStatus
    });

    if(statusCheckResp.err){
      throw oThis.getError(`error when waiting for instances to be stopped`, 'err_ser_as_stop_sp4');
    }

    // update final status in DB
    let resp = await oThis.Helper.appEC2.updateEc2StatusAndDataInDB({
      instanceIdsMap: instanceIdsMap,
      awsConnectionParams: awsConnectionParams,
      app: options.app
    });

    if (!resp) {
      throw oThis.getError(`Error in marking DB status as stopped `, 'err_ser_as_stop_sp5');
    }

    return resp;
  }
};

Object.assign(StopApp.prototype, servicePrototype);

/**
 * Stop apps
 * @module services/app_setup/stop_app
 */
module.exports = StopApp;
