'use strict';

function define(name, value) {
  Object.defineProperty(exports, name, {
    value: value,
    enumerable: true
  });
}

// Define vars for ENV variables.
define('INFRA_MYSQL_HOST', process.env.OST_INFRA_MYSQL_HOST);
define('INFRA_MYSQL_PORT', process.env.OST_INFRA_MYSQL_PORT);
define('INFRA_MYSQL_USER', process.env.OST_INFRA_MYSQL_USER);
define('INFRA_MYSQL_PASSWORD', process.env.OST_INFRA_MYSQL_PASSWORD);
define('INFRA_MYSQL_DB', process.env.OST_INFRA_MYSQL_DB);
define('INFRA_MYSQL_CONNECTION_POOL_SIZE', process.env.OST_INFRA_MYSQL_CONNECTION_POOL_SIZE);

define('INFRA_IP_ADDRESS', process.env.OST_INFRA_IP_ADDRESS);
define('INFRA_AWS_ACCESS_KEY', process.env.OST_INFRA_AWS_ACCESS_KEY);
define('INFRA_AWS_KEY_SECRET', process.env.OST_INFRA_AWS_KEY_SECRET);
define('INFRA_AWS_REGION', process.env.OST_INFRA_AWS_REGION);
define('INFRA_AWS_ACCOUNT_ID', process.env.OST_INFRA_AWS_ACCOUNT_ID);
define('INFRA_AWS_KMS_KEY_ID', process.env.OST_INFRA_AWS_KMS_KEY_ID);

// Define fixer API.
define('FIXER_API_KEY', process.env.OST_FIXER_API_KEY);

define('INFRA_WORKSPACE', process.env.OST_INFRA_WORKSPACE);
