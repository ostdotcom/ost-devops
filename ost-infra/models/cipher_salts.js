'use strict';

/**
 * Model to get client config strategy details.
 *
 * @module /models/client_config_strategies
 */

const rootPrefix = '..'
  , envConstants = require(rootPrefix + '/config/env_constants')
  , ModelBaseKlass = require(rootPrefix + '/models/base')
  , LocalCipher = require(rootPrefix + '/lib/utils/local_cipher')
;

const dbName = envConstants.INFRA_MYSQL_DB;

const CipherSaltsModel = function() {
  const oThis = this;

  ModelBaseKlass.call(oThis, { dbName: dbName });

  oThis.localCipher = LocalCipher;
};

CipherSaltsModel.prototype = Object.create(ModelBaseKlass.prototype);
CipherSaltsModel.prototype.constructor = CipherSaltsModel;

/*
 * Public methods
 */
const ModelPrototype = {
  tableName: 'cipher_salts',

  enums: {},

  create: function(options) {
    const oThis = this;

    if (!options.kmsCipherTextBlob || !options.kmsKeyId) {
      throw 'Mandatory parameters are missing.';
    }

    let queryData = {
      kms_cipher_text_blob: options.kmsCipherTextBlob,
      kms_key_id: options.kmsKeyId
    };

    return oThis.insert(queryData).fire();
  },

};

Object.assign(CipherSaltsModel.prototype, ModelPrototype);

module.exports = CipherSaltsModel;
