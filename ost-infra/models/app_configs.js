'use strict';

/**
 * Model to manage app configs
 *
 * @module /models/app_configs
 */

const rootPrefix = '..'
  , envConstants = require(rootPrefix + '/config/env_constants')
  , ModelBaseKlass = require(rootPrefix + '/models/base')
;

const dbName = envConstants.INFRA_MYSQL_DB;

const AppConfigsModel = function() {
  const oThis = this;

  ModelBaseKlass.call(oThis, { dbName: dbName });
};

AppConfigsModel.prototype = Object.create(ModelBaseKlass.prototype);
AppConfigsModel.prototype.constructor = AppConfigsModel;

/*
 * Public methods
 */
const ModelPrototype = {
  tableName: 'app_configs',

  enums: {},

  /**
   * Get details by app identifier and stackConfigs.Id
   *
   * @param {string} appId - Application identifier
   * @param {number} stackConfigId - stack_configs table id
   * @returns {*}
   */
  getByAppIdStackConfigId: async function(appId, stackConfigId) {
    const oThis = this;

    return await oThis
      .select('*')
      .where({ app_id: appId, stack_config_id: stackConfigId })
      .fire();
  },

  /**
   * Create configs for app
   *
   * @param {Object} options - Create parameters
   * @param {number} options.stackConfigId
   * @param {string} options.appId
   * @param {string} options.env
   * @param {number} options.subEnv
   * @param {number} options.commonConfigData
   * @param {number} options.appConfigData
   * @param {number} options.opsConfigData
   * @param {string} options.cipherSaltId
   * @returns {*}
   */
  create: function(options) {
    const oThis = this;

    if (!options.stackConfigId || !options.appId || !options.env || !options.subEnv || !options.commonConfigData || !options.appConfigData || !options.opsConfigData || !options.cipherSaltId) {
      throw 'Mandatory parameters are missing.';
    }

    let queryData = {
      stack_config_id: options.stackConfigId,
      app_id: options.appId,
      env: options.env,
      sub_env: options.subEnv,
      enc_common_config_data: options.commonConfigData,
      enc_app_config_data: options.appConfigData,
      enc_ops_config_data: options.opsConfigData,
      cipher_salt_id: options.cipherSaltId,
    };

    return oThis.insert(queryData).fire();
  },

  /**
   * Update App Config by id
   *
   * @param {string} commonConfig - Encrypted common config data
   * @param {string} appConfig - Encrypted app config data
   * @param {string} opsConfig - Encrypted ops config data
   * @param {number} appConfigId - Table Id
   * @returns {*}
   */
  updateCommonConfigAppConfigOpsConfigById: async function(commonConfig, appConfig, opsConfig, appConfigId){
    const oThis = this;

    if (!commonConfig) {
      throw oThis.getError('Invalid commonConfig data!', 'err_mod_acu_v1');
    }

    if (!appConfig) {
      throw oThis.getError('Invalid appConfig data!', 'err_mod_acu_v2');
    }

    if (!opsConfig) {
      throw oThis.getError('Invalid opsConfig data!', 'err_mod_acu_v3');
    }

    if (!appConfigId) {
      throw oThis.getError('Invalid appConfigId!', 'err_mod_acu_v4');
    }

    return oThis
      .update({
        enc_common_config_data: commonConfig,
        enc_app_config_data: appConfig,
        enc_ops_config_data: opsConfig
      })
      .where({
        id: appConfigId
      })
      .fire();
  }

};

Object.assign(AppConfigsModel.prototype, ModelPrototype);

module.exports = AppConfigsModel;
