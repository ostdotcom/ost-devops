'use strict';

/**
 * Model to get client config strategy details.
 *
 * @module /models/client_config_strategies
 */

const rootPrefix = '..'
  , envConstants = require(rootPrefix + '/config/env_constants')
  , ModelBaseKlass = require(rootPrefix + '/models/base')
;

const dbName = envConstants.INFRA_MYSQL_DB;

const StackConfigsModel = function() {
  const oThis = this;

  ModelBaseKlass.call(oThis, { dbName: dbName });
};

StackConfigsModel.prototype = Object.create(ModelBaseKlass.prototype);
StackConfigsModel.prototype.constructor = StackConfigsModel;

/*
 * Public methods
 */
const ModelPrototype = {
  tableName: 'stack_configs',

  enums: {},

  /**
   * Get details by stack id and env
   *
   * @param {number} stackId - Platform Id
   * @param {string} env - Environment
   * @param {string} env - Sub-Environment
   * @returns {*}
   */
  getByStackIdEnvSubEnv: function(stackId, env, subEnv) {
    const oThis = this;

    return oThis
      .select('*')
      .where({ stack_id: stackId, env: env, sub_env: subEnv })
      .fire();
  },

  /**
   * Create stack configs for stack id ans env
   *
   * @param {Object} options - Create parameters
   * @param {number} options.stackId
   * @param {string} options.env
   * @param {string} options.subEnv
   * @param {number} options.awsAccountId
   * @param {string} options.awsRegion
   * @param {string} options.stackData
   * @param {string} options.commonData
   * @param {number} options.cipherSaltId
   * @returns {*}
   */
  create: async function(options) {
    const oThis = this;

    if (!options.stackId || !options.env || !options.subEnv  || !options.awsAccountId || !options.awsRegion || !options.stackData || !options.commonData || !options.cipherSaltId) {
      throw oThis.getError('Mandatory parameters are missing.', 'err_mod_sc_c1');
    }

    let queryData = {
      stack_id: options.stackId,
      env: options.env,
      sub_env: options.subEnv,
      aws_account_id: options.awsAccountId,
      aws_region: options.awsRegion,
      enc_stack_data: options.stackData,
      common_data: options.commonData,
      cipher_salt_id: options.cipherSaltId
    };

    return oThis.insert(queryData).fire();
  },

  /**
   * Update stack data by id
   *
   * @param {string} stackData - Encrypted stack data
   * @param {number} stackConfigId - Table Id
   * @returns {*}
   */
  updateStackDataAndCommonDataById: async function(stackData, commonData, stackConfigId){
    const oThis = this;

    if (!stackConfigId) {
      throw oThis.getError('Invalid stackConfigId!', 'err_mod_sc_u1');
    }

    if (!stackData) {
      throw oThis.getError('Invalid stackData!', 'err_mod_sc_u2');
    }

    if (!commonData) {
      throw oThis.getError('Invalid commonData!', 'err_mod_sc_u3');
    }

    return oThis
      .update({
        enc_stack_data: stackData,
        common_data: commonData
      })
      .where({
        id: stackConfigId
      })
      .fire();
  }

};

Object.assign(StackConfigsModel.prototype, ModelPrototype);

module.exports = StackConfigsModel;
