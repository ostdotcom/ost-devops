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
  return db.createTable('ec2_instances', {
    id: {type: 'int', primaryKey: true, autoIncrement: true},
    instance_id: {type: 'string', notNull: true},
    ip_address: {type: 'string', notNull: true},
    status: {type: 'string', notNull: true},
    data: {type: 'text'},
    created_at: {type: 'datetime', notNull: true},
    updated_at: {type: 'datetime', notNull: true},
  }).then(function (result) {
    db.addIndex('ec2_instances', 'unq1', ['instance_id'], true);
  });
};

exports.down = function(db) {
  return db.dropTable('ec2_instances');
};

exports._meta = {
  "version": 1
};
