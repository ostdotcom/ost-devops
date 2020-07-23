'use strict';

const rootPrefix = '../..'
  , EC2ServiceStatusCheck = require(rootPrefix + '/lib/aws/ec2/status_check')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Create app server
 * @class
 */
const UpdateServerStatus = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

UpdateServerStatus.prototype = Object.create(ServiceBase.prototype);
UpdateServerStatus.prototype.constructor = UpdateServerStatus;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_uas_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_uas_v2');
    }

    if(!oThis.constants.ec2WaitForStatuses().includes(options.ec2Status)){
      options.ec2Status = oThis.constants.waitForEc2RunningStatus;
    }

  },

  /**
   * Update Service for app server status
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.ec2Status - Expected ec2 status
   * @param {string} options.chainId - Group id if there is any? (in case of utility chain specific machines)
   * @param {string} options.ipAddresses - limit to some ips
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    if(oThis.constants.webAppsForApis().includes(options.app)){
      console.log("**********************No need for app_setup for web interface apps******************************* ");
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
      throw oThis.getError(`Error while fetching stack configs info for app: ${options.app}`, 'err_ser_as_uas_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    // Get instance ids map
    let instanceIdsData = await oThis.Helper.appEC2.getInstanceIds({
      stackConfigId: scRespData['id'],
      app: options.app,
      plainText: scRespData['plainText'],
      chainId: options.chainId,
      ipAddresses: options.ipAddresses,
      status: []
    });

    let ec2InstanceIds = instanceIdsData['cronInstanceEc2Ids'].concat(instanceIdsData['cronPriorityInstanceEc2Ids']).concat(instanceIdsData['appInstanceEc2Ids']);

    if (ec2InstanceIds.length < 1) {
      throw oThis.getError(`Error getting EC2 instance ids for app: ${options.app}`, 'err_ser_as_uas_sp2');
    }

    let awsConnectionParams = await oThis.getAppInitParams(options.subEnv);

    // Wait for pending status to complete
    if(instanceIdsData['pendingStatusEc2Ids'].length > 0){

      let statusCheckObj = new EC2ServiceStatusCheck(awsConnectionParams)
        , statusCheckResp = await statusCheckObj.perform({
        app: options.app, instanceIds: instanceIdsData['pendingStatusEc2Ids'], checkForState: options.ec2Status
      });

      if(statusCheckResp.err){
        throw oThis.getError(`error when waiting for instances to be started`, 'err_ser_as_uas_sp3');
      }
    }

    // update final status in DB
    let resp = await oThis.Helper.appEC2.updateEc2StatusAndDataInDB({
      instanceIdsMap: instanceIdsData['instanceIdsMap'],
      awsConnectionParams: awsConnectionParams,
      app: options.app
    });

    if (!resp) {
      throw oThis.getError(`Error in marking DB status as started `, 'err_ser_as_uas_sp4');
    }

    return resp;

  }

};

Object.assign(UpdateServerStatus.prototype, servicePrototype);

/**
 * Update app server status
 * @module services/app_setup/update_app_status
 */
module.exports = UpdateServerStatus;
