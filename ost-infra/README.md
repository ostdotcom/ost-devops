OST-INFRA
==========

## Prerequisites for Installation 

* NodeJS >= 8.7.0
* MySQL >= 5.6

## Export following ENV variables for DB connection

```

export INFRA_DB_HOST='<Mysql host url>'
export INFRA_DB_USER='<DB user name>'
export INFRA_DB_PASSWD='<DB user password>'
export INFRA_DB_NAME='<Database name>'
export INFRA_MYSQL_PORT=<Mysql host port>

export INFRA_WORKSPACE='<path to directory>'

```
 
## Run migrations

```bash

cd <APP ROOT_DIR>;
export INFRA_MYSQL_DB='<database name>';
./node_modules/db-migrate/bin/db-migrate db:create ${INFRA_DB_NAME};
# Single upgrade
./node_modules/db-migrate/bin/db-migrate up;
# Single downgrade
./node_modules/db-migrate/bin/db-migrate down;

```

## Create Tables (For development purpose only test)

```bash

cd <APP ROOT_DIR>;
export INFRA_MYSQL_DB='<database name>';
./node_modules/db-migrate/bin/db-migrate create '<table_name>'

```


## =================================================

## Get ST OWNER and ST ADMIN address and PK

> Go to app root directory<br>
node>
 

```javascript
let ostInfracommonParams = {
  platformId: 4,
  env: 'production'
};
let performOptions = {
  subEnv: 'sandbox',
  app: 'utility',
  chainId: 3
};

let rootPrefix = '.';
let chainAddressKlass = require(rootPrefix + '/services/app_config/saasApi/get_chain_addreses');

let performerObj = new chainAddressKlass(ostInfracommonParams);
performerObj.perform(performOptions).then(console.log);

```

     