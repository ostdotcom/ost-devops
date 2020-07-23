'use strict';

/**
 * Model to manage EC2 instances
 *
 * @module /models/ec2_instances
 */

const rootPrefix = '..'
  , envConstants = require(rootPrefix + '/config/env_constants')
  , ModelBaseKlass = require(rootPrefix + '/models/base')
;

const dbName = envConstants.INFRA_MYSQL_DB;

const unknownStatus = 'unknown';

const EC2InstancesModel = function() {
  const oThis = this;

  ModelBaseKlass.call(oThis, { dbName: dbName });
};

EC2InstancesModel.prototype = Object.create(ModelBaseKlass.prototype);
EC2InstancesModel.prototype.constructor = EC2InstancesModel;

/*
 * Public methods
 */
const ModelPrototype = {
  tableName: 'ec2_instances',

  enums: {},

  /**
   * Get details by EC2 Instance identifier
   *
   * @param {string} instanceId - Instance identifier
   * @returns {*}
   */
  getByInstanceId: function(instanceId) {
    const oThis = this;

    return oThis
      .select('*')
      .where({ instance_id: instanceId })
      .fire();
  },

  /**
   * Get details by EC2 Instance identifier list
   *
   * @param {Array} instanceIds - Instance identifier list
   * @returns {*}
   */
  getByInstanceIds: function(instanceIds) {
    const oThis = this;

    return oThis
      .select('*')
      .where(['instance_id IN (?)', instanceIds])
      .fire();
  },

  /**
   * Create EC2 instance
   *
   * @param {Object} options - Create parameters
   * @param {number} options.instanceId
   * @param {string} options.ipAddress
   * @param {string} options.data
   * @param {string} options.status
   * @returns {*}
   */
  create: async function(options) {
    const oThis = this;

    if (!options.instanceId || !options.ipAddress || !options.data || !options.status) {
      throw 'Mandatory parameters are missing.';
    }

    let queryData = {
      instance_id: options.instanceId,
      ip_address: options.ipAddress,
      status: options.status,
      data: JSON.stringify(options.data),
    };

    return oThis.insert(queryData).fire();
  },

  /**
   * Update EC2 instance status and data by instanceId
   *
   * @param {string|null} status - EC2 instance status
   * @param {string|null} data - AWS Describe instance result data
   * @param {string} instanceId - AWS instance identifier
   * @returns {*}
   */
  updateStatusAndDataByInstanceId: async function(instanceId, status, data){
    const oThis = this;

    if (!instanceId) {
      throw oThis.getError(`${oThis.constructor.name}: Invalid instanceId!`, 'err_mod_ei_u_v1');
    }

    return oThis
      .update({
        status: status || unknownStatus,
        data: (data ? JSON.stringify(data) : null)
      })
      .where({
        instance_id: instanceId
      })
      .fire();
  }

};

Object.assign(EC2InstancesModel.prototype, ModelPrototype);

module.exports = EC2InstancesModel;
