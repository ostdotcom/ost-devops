'use strict';

/**
 * Model to manage Chain addresses
 *
 * @module /models/chain_addresses
 */

const rootPrefix = '..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , Constants = new ConstantsKlass()
  , CommonUtil = require(rootPrefix + '/lib/utils/common')
  , ModelBaseKlass = require(rootPrefix + '/models/base')
;

const dbName = Constants.envConstants.INFRA_MYSQL_DB;

const addressKinds = Constants.dbConstants.addressKinds
  , invertedAddressKinds = CommonUtil.invert(addressKinds)
;

const ChainAddressesModel = function() {
  const oThis = this;

  ModelBaseKlass.call(oThis, { dbName: dbName });
};

ChainAddressesModel.prototype = Object.create(ModelBaseKlass.prototype);
ChainAddressesModel.prototype.constructor = ChainAddressesModel;

/*
 * Public methods
 */
const ModelPrototype = {
  tableName: 'chain_addresses',

  enums: invertedAddressKinds,

  /**
   * Get details by app identifier and stackConfigs.Id
   *
   * @param {String} appId - Application identifier
   * @param {Number} stackConfigId - stack_configs table id
   * @param {Array} addressKinds - List of Address Kinds
   *
   * @returns {*}
   */
  getByAppIdStackConfigIdKinds: async function(appId, stackConfigId, addressKinds) {
    const oThis = this;

    return await oThis
      .select('*')
      .where({
        app_id: appId,
        stack_config_id: stackConfigId,
        kind: addressKinds
      })
      .fire();
  },

  /**
   * Create Chain address for app
   *
   * @param {Object} options - Create parameters
   * @param {number} options.stackConfigId
   * @param {number} options.stackId
   * @param {string} options.appId
   * @param {string} options.env
   * @param {number} options.subEnv
   * @param {number} options.address
   * @param {number} options.encAddressData
   * @param {number} options.groupId
   * @param {string} options.addressKind
   * @param {string} options.cipherSaltId
   * @returns {*}
   */
  create: function(options) {
    const oThis = this;

    if (!options.stackConfigId || !options.stackId || !options.appId || !options.env || !options.subEnv || !options.address || !options.groupId) {
      throw 'ChainAddressesModel::Create: Mandatory parameters are missing!';
    }

    if(oThis.enums.hasOwnProperty(options.addressKind) === false){
      throw 'ChainAddressesModel::Create: Invalid address kind!';
    }

    let queryData = {
      stack_config_id: options.stackConfigId,
      stack_id: options.stackId,
      app_id: options.appId,
      env: options.env,
      sub_env: options.subEnv,
      group_id: options.groupId || 0,
      address: options.address,
      enc_address_data: options.encAddressData || null,
      kind: options.addressKind,
      cipher_salt_id: options.cipherSaltId || null
    };

    return oThis.insert(queryData).fire();
  },

};

Object.assign(ChainAddressesModel.prototype, ModelPrototype);

module.exports = ChainAddressesModel;
