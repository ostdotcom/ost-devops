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
    .runSql('ALTER TABLE `app_ec2_instances` ADD `app_status` TEXT NULL AFTER `app_data`;')
    .then(function (result) {
      console.log("addColumn::app_ec2_instances::app_status => ", result);
    });
};

exports.down = function(db) {
  return db.removeColumn('app_ec2_instances', 'app_status');
};

exports._meta = {
  "version": 1
};
