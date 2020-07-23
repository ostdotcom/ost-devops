"use strict";

const rootPrefix = '../..'
  , EnvConstants = require(rootPrefix + '/config/env_constants')
  , DBConstants = require(rootPrefix + '/config/db_constants')
  , NagiosConstants=require(rootPrefix+'/config/nagios_constants.json');
;

const AnsibleInventoryVars = function () {
  const oThis = this;
};

AnsibleInventoryVars.prototype = {

  appPath: function (app, profileType) {
    return `/mnt/${profileType || 'st-company'}/apps/${app}`;
  },

  currentPath: function (app, profileType) {
    return `${this.appPath(app, profileType)}/current`;
  },

  sharedPath: function (app, profileType) {
    return `${this.appPath(app, profileType)}/shared`;
  },

  releasePath: function (app, buildNumber, profileType) {
    return `${this.appPath(app, profileType)}/releases/${buildNumber}`;
  },

  appLogsDir: function (app, profileType) {
    return `${this.sharedPath(app, profileType)}/log`
  },

  gethLogsDir: function () {
    return '/mnt/logs/geth';
  },

  nginxLogsDir: function () {
    return '/mnt/logs/nginx';
  },

  pentahoLogsDir: function () {
    return '/mnt/logs/pentaho';
  }
};

module.exports = new AnsibleInventoryVars();
