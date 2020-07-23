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
  return db
    .createTable('error_logs', {
      id: { type: 'bigint', primaryKey: true, autoIncrement: true },
      app: { type: 'string', notNull: true },
      env_id: { type: 'string', notNull: true },
      machine_ip: { type: 'string', notNull: true },
      severity: { type: 'string', notNull: true },
      kind: { type: 'string', notNull: true },
      data: { type: 'text' },
      status: { type: 'string', notNull: true },
      retry_count: { type: 'int', defaultValue: 0},
      created_at: { type: 'datetime', notNull: true },
      updated_at: { type: 'datetime', notNull: true }
    })
    .then(function(result) {
      db.addIndex('error_logs', 'index_1', ['severity', 'status']);
    });
};

exports.down = function(db) {
  return db.dropTable('error_logs');
};

exports._meta = {
  version: 1
};
