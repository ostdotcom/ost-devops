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
  return db.createTable('cipher_salts', {
    id: {type: 'int', primaryKey: true, autoIncrement: true},
    kms_cipher_text_blob: {type: 'blob'},
    kms_key_id: {type: 'string'},
    created_at: {type: 'datetime', notNull: true},
    updated_at: {type: 'datetime', notNull: true},
  });
};

exports.down = function(db) {
  return db.dropTable('cipher_salts');
};

exports._meta = {
  "version": 1
};
