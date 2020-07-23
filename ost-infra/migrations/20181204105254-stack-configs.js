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
  return db.createTable('stack_configs', {
    id: {type: 'int', primaryKey: true, autoIncrement: true},
    stack_id: {type: 'int', notNull: true},
    env: {type: 'string', length: 50, notNull: true},
    sub_env: {type: 'string', length: 50, notNull: true},
    aws_account_id: {type: 'string', length: 50, notNull: true},
    aws_region: {type: 'string', notNull: true},
    enc_stack_data: {type: 'text'},
    common_data: {type: 'text'},
    cipher_salt_id: {type: 'int', notNull: true},
    created_at: {type: 'datetime', notNull: true},
    updated_at: {type: 'datetime', notNull: true},
  }).then(function (result) {
    db.addIndex('stack_configs', 'unq1', ['stack_id', 'env', 'sub_env'], true);
  });
};

exports.down = function(db) {
  return db.dropTable('stack_configs');
};

exports._meta = {
  "version": 1
};
