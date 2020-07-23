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
  return db.createTable('app_ec2_instances', {
    id: {type: 'int', primaryKey: true, autoIncrement: true},
    stack_config_id: {type: 'int', notNull: true},
    stack_id: {type: 'int', notNull: true},
    env: {type: 'string', length: 50, notNull: true},
    sub_env: {type: 'string', length: 50, notNull: true},
    app_id: {type: 'string', length: 50, notNull: true},
    ec2_instance_id: {type: 'int', notNull: true},
    group_id: {type: 'string', length: 50},
    ip_address: {type: 'string', notNull: true},
    app_data: {type: 'text'},
    status: {type: 'string', length: 50, notNull: true},
    created_at: {type: 'datetime', notNull: true},
    updated_at: {type: 'datetime', notNull: true},
  }).then(function (result) {
    db.addIndex('app_ec2_instances', 'unq1', ['stack_config_id', 'app_id', 'ec2_instance_id'], true);
  });
};

exports.down = function(db) {
  return db.dropTable('app_ec2_instances');
};

exports._meta = {
  "version": 1
};
