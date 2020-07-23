'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.createTable('app_configs', {
    id: {type: 'int', primaryKey: true, autoIncrement: true},
    stack_config_id: {type: 'int', notNull: true},
    app_id: {type: 'string', notNull: true},
    env: {type: 'string', length: 50, notNull: true},
    sub_env: {type: 'string', length: 50, notNull: true},
    enc_common_config_data: {type: 'text'},
    enc_app_config_data: {type: 'text'},
    enc_ops_config_data: {type: 'text'},
    cipher_salt_id: {type: 'int', notNull: true},
    created_at: {type: 'datetime', notNull: true},
    updated_at: {type: 'datetime', notNull: true},
  }).then(function (result) {
    db.addIndex('app_configs', 'unq1', ['stack_config_id', 'app_id'], true);
  });
};

exports.down = function(db) {
  return db.dropTable('app_configs');
};

exports._meta = {
  "version": 1
};
