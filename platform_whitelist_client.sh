#!/usr/bin/env bash

client_email="tilo.hirsch@hornet.com"
rake RAILS_ENV=production whitelist_client_for_mainnet EMAIL=$client_email CONFIG_GROUP_ID=1 TOKEN_USERS_SHARD_NUMBER=1 BALANCE_SHARD_NUMBER=1
