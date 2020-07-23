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
  return db.createTable('chain_addresses', {
    id: {type: 'int', primaryKey: true, autoIncrement: true},
    stack_config_id: {type: 'int', notNull: true},
    stack_id: {type: 'int', notNull: true},
    env: {type: 'string', length: 50, notNull: true},
    sub_env: {type: 'string', length: 50, notNull: true},
    app_id: {type: 'string', length: 50, notNull: true},
    group_id: {type: 'string', length: 50},
    address: {type: 'string', length: 50, notNull: true},
    kind: {type: 'string', length: 50},
    enc_address_data: {type: 'text'},
    cipher_salt_id: {type: 'int'},
    created_at: {type: 'datetime', notNull: true},
    updated_at: {type: 'datetime', notNull: true},
  }).then(function (result) {
    db.addIndex('chain_addresses', 'unq1', ['stack_config_id', 'app_id', 'group_id', 'address'], true);
  });
};

exports.down = function(db) {
  return db.dropTable('chain_addresses');
};

exports._meta = {
  "version": 1
};
