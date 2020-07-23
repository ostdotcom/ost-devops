'use strict';

const rootPrefix = '..'
  , AppEC2Helper = require(rootPrefix + '/helpers/app_ec2')
  , AppSetup = require(rootPrefix + '/helpers/app_setup')
  , AnsibleHelper = require(rootPrefix + '/helpers/ansible')
  , ChainAddressHelper = require(rootPrefix + '/helpers/chain_address')
  , AppConfigsHelper = require(rootPrefix + '/helpers/app_configs')
  , PlatformHelper = require(rootPrefix + '/helpers/platform.js')
;

const HelperPrototype = {

  platform: new PlatformHelper(),
  appEC2: new AppEC2Helper(),
  appSetup: new AppSetup(),
  ansible: new AnsibleHelper(),
  chainAddress: new ChainAddressHelper(),
  appConfigs: new AppConfigsHelper()

};

module.exports = HelperPrototype;
