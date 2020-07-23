'use strict';

/**
 * Model to Manage app EC2 instance
 *
 * @module /models/app_ec2_instances
 */

const rootPrefix = '..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , Constants = new ConstantsKlass()
  , ModelBaseKlass = require(rootPrefix + '/models/base')
;

const dbName = Constants.envConstants.INFRA_MYSQL_DB;

const unknownStatus = 'unknown'
  , pendingStatus = 'pending'
  , activeStatus = 'active'
  , inActiveStatus = 'inactive'
  , stoppedStatus='stopped'
;

const AppEC2InstancesModel = function() {
  const oThis = this;

  ModelBaseKlass.call(oThis, { dbName: dbName });
};

AppEC2InstancesModel.prototype = Object.create(ModelBaseKlass.prototype);
AppEC2InstancesModel.prototype.constructor = AppEC2InstancesModel;

/*
 * Public methods
 */
const ModelPrototype = {
  tableName: 'app_ec2_instances',

  enums: {},

  getAppEC2Status: function (ec2Status) {
    const oThis = this;

    let status = unknownStatus;
    if(Constants.ec2PendingStatuses.includes(ec2Status)){
      status = pendingStatus;
    } else if(Constants.ec2ActiveStatuses.includes(ec2Status)){
      status = activeStatus;
    } else if(Constants.ec2InActiveStatuses.includes(ec2Status)){
      status = inActiveStatus;
    } else if(Constants.ec2StoppedStatuses.includes(ec2Status)){
      status = stoppedStatus;
    }
    return status;
  },

  /**
   * Get details by EC2 Instance identifier
   *
   * @param {String} appId - Application identifier
   * @param {number} stackConfigId - StackConfig.Id
   * @param {String} status - Optional, DB entry status
   * @returns {*}
   */
  getByAppIdStackConfigId: function(appId, stackConfigId, status) {
    const oThis = this;

    let reqParams = { app_id: appId, stack_config_id: stackConfigId };
    if(status && status.length > 0){
      reqParams['status'] = status;
    }
    return oThis
      .select('*')
      .where(reqParams)
      .fire();
  },

  /**
   * Get details by stack config id
   *
   * @param {number} stackConfigId - StackConfig.Id
   * @param {String} status - Optional, DB entry status
   * @returns {*}
   */
  getByStackConfigId: function(stackConfigId, status) {
    const oThis = this;

    let reqParams = { stack_config_id: stackConfigId };
    if(status && status.length > 0){
      reqParams['status'] = status;
    }

    return oThis
      .select('*')
      .where(reqParams)
      .fire();
  },

  /**
   * Get details by EC2 Instance identifier
   *
   * @param {string} appId - Application identifier
   * @param {number} stackConfigId - StackConfig.Id
   * @param {number} ipAddresses - List of ip addresses
   * @param {number} status - Optional, DB entry status
   * @returns {*}
   */
  getByAppIdStackConfigIdAndIpAddresses: function(appId, stackConfigId, ipAddresses, status) {
    const oThis = this;

    let reqParams = { app_id: appId, stack_config_id: stackConfigId , ip_address: ipAddresses };
    if(status){
      reqParams['status'] = status;
    }
    return oThis
      .select('*')
      .where(reqParams)
      .fire();
  },

  /**
   * Get Details by EC2 instance id
   *
   * @param {string} ec2InstanceId - EC2 instance Id
   * @returns {*}
   */
  getByEC2InstanceId: function(ec2InstanceId) {
    const oThis = this;

    return oThis
      .select('*')
      .where({ ec2_instance_id: ec2InstanceId })
      .fire();
  },

  /**
   * Get ec2 instance details  by platformid and env
   *
   * @param  options.platformId - PlatformId
   * @param  options.env - env
   * @returns {*}
   */
  getByPlatformAndEnv: function(options) {
    const oThis = this;

    return oThis
      .select('*')
      .where({ stack_id: options.platformId ,env:options.env })
      .fire();
  },
  /**
   * Create App EC2 instance
   *
   * @param {Object} options - Create parameters
   * @param {number} options.stackConfigId
   * @param {number} options.stackId
   * @param {string} options.env
   * @param {string} options.subEnv
   * @param {string} options.appId
   * @param {string} options.ec2InstanceId
   * @param {string} options.groupId
   * @param {string} options.ipAddress
   * @param {string} options.appData
   * @returns {*}
   */
  create: function(options) {
    const oThis = this;

    if (!options.stackConfigId || !options.stackId || !options.env || !options.subEnv || !options.appId || !options.ec2InstanceId || !options.ipAddress || !options.appData) {
      throw 'Mandatory parameters are missing.';
    }

    let queryData = {
      stack_config_id: options.stackConfigId,
      stack_id: options.stackId,
      env: options.env,
      sub_env: options.subEnv,
      app_id: options.appId,
      ec2_instance_id: options.ec2InstanceId,
      group_id: (options.groupId ? options.groupId : null),
      ip_address: options.ipAddress,
      app_data: JSON.stringify(options.appData),
      status: pendingStatus
    };

    return oThis.insert(queryData).fire();
  },

  /**
   * Update App EC2 instance status by Id
   *
   * @param {string|null} status - App EC2 instance status
   * @param {number} id - Table Id
   * @returns {*}
   */
  updateStatusByEc2InstanceId: async function(ec2InstanceId, status){
    const oThis = this;

    if (!ec2InstanceId) {
      throw oThis.getError(`${oThis.constructor.name}: Invalid ec2InstanceId!`, 'err_mod_aei_u_v1');
    }


    return oThis
      .update({
        status: oThis.getAppEC2Status(status)
      })
      .where({
        ec2_instance_id: ec2InstanceId
      })
      .fire();
  },

  /**
   * Update App data by Id
   *
   * @param {Object} appData - Inventory app data
   * @param {number} id - Table Id
   * @returns {*}
   */
  updateAppDataById: async function(appData, id){
    const oThis = this;

    if (!id) {
      throw oThis.getError(`${oThis.constructor.name}: Invalid id for updateAppDataByAppIdAndStackConfigId!`, 'err_mod_aei_uabas_v1');
    }

    if (!appData) {
      throw oThis.getError(`${oThis.constructor.name}: Invalid appData for updateAppDataByAppIdAndStackConfigId!`, 'err_mod_aei_uabas_v2');
    }

    return oThis
      .update({
        app_data: JSON.stringify(appData)
      })
      .where({
        id: id
      })
      .fire();
  },

  /**
   * Append app status data and update by Id
   *
   * @param {Object} appStatusData - App status data
   * @param {number} id - Table Id
   * @returns {*}
   */
  appendAppStatusDataById: async function(appStatusData, id){
    const oThis = this;

    if (!id) {
      throw oThis.getError(`${oThis.constructor.name}: Invalid id for appendAppStatusById!`, 'err_mod_aei_aaps_v1');
    }

    if (!appStatusData) {
      throw oThis.getError(`${oThis.constructor.name}: Invalid appData for appendAppStatusById!`, 'err_mod_aei_aaps_v2');
    }

    let rowData = (await oThis.getById(id))[0];
    if(!rowData){
      throw oThis.getError(`${oThis.constructor.name}: appendAppStatusById: Data not present for id ${id}!`, 'err_mod_aei_aaps_v3');
    }
    let statusData = JSON.parse(rowData['app_status'] ? rowData['app_status'] : '{}');
    Object.assign(statusData, appStatusData);

    return oThis
      .update({
        app_status: JSON.stringify(statusData)
      })
      .where({
        id: id
      })
      .fire();
  }

};

Object.assign(AppEC2InstancesModel.prototype, ModelPrototype);

module.exports = AppEC2InstancesModel;
