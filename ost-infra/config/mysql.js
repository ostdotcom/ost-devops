'use strict';

const rootPrefix = '..',
  envConstants = require(rootPrefix + '/config/env_constants');

const mysqlConfig = {
  commonNodeConfig: {
    connectionLimit: envConstants.INFRA_MYSQL_CONNECTION_POOL_SIZE,
    charset: 'UTF8_UNICODE_CI',
    bigNumberStrings: true,
    supportBigNumbers: true,
    dateStrings: true,
    debug: false
  },
  commonClusterConfig: {
    canRetry: true,
    removeNodeErrorCount: 5,
    restoreNodeTimeout: 10000,
    defaultSelector: 'RR'
  },
  clusters: {
    infra_cluster: {
      master: {
        host: envConstants.INFRA_MYSQL_HOST,
        port: envConstants.INFRA_MYSQL_PORT || 3306,
        user: envConstants.INFRA_MYSQL_USER,
        password: envConstants.INFRA_MYSQL_PASSWORD
      }
    },
    app_infra_staging: {
      master: {
        host: envConstants.INFRA_MYSQL_HOST,
        port: envConstants.INFRA_MYSQL_PORT || 3306,
        user: envConstants.INFRA_MYSQL_USER,
        password: envConstants.INFRA_MYSQL_PASSWORD
      }
    },
    app_infra_development: {
      master: {
        host: envConstants.INFRA_MYSQL_HOST,
        port: envConstants.INFRA_MYSQL_PORT || 3306,
        user: envConstants.INFRA_MYSQL_USER,
        password: envConstants.INFRA_MYSQL_PASSWORD
      }
    },
    app_infra_production: {
      master: {
        host: envConstants.INFRA_MYSQL_HOST,
        port: envConstants.INFRA_MYSQL_PORT || 3306,
        user: envConstants.INFRA_MYSQL_USER,
        password: envConstants.INFRA_MYSQL_PASSWORD
      }
    }
  },
  databases: {}
};

mysqlConfig['databases'] = {
  'app_infra_staging':['app_infra_staging'],
  'app_infra_development':['app_infra_development'],
  'app_infra_production':['app_infra_production'],
  'infra_staging': ['infra_cluster'],
  'infra_production': ['infra_cluster'],
  'infra_logs_staging': ['infra_cluster'],
  'infra_logs_production': ['infra_cluster'],
  'infra_development': ['infra_cluster']
};

module.exports = mysqlConfig;
