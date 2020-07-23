#!/usr/bin/env node
'use strict';

const rootPrefix = '../..'
  , Constants = require(rootPrefix + '/config/constants')
  , ValueInitSetup = require(rootPrefix + '/services/value_chain/init_setup')
  , ValueChainRestart = require(rootPrefix + '/services/value_chain/restart')

;

const command = require('commander')
  , ConstantsObj = new Constants()
  , envs = ConstantsObj.envList()
  , subEnvs = ConstantsObj.subEnvList()
;

const allowedEnvs = eval('/(' + envs.join('|') + ')/i')
  , allowedSubEnvs = eval('/(' + subEnvs.join('|') + ')/i')
;

command
  .version('0.1.0')
  .usage('[options]')
  .option('--response-out-file <string>', 'Response output file in form of JSON')
  .option('-z, --value-init-setup', 'Setup and init Utility chain')
  .option('-r, --restart', 'restart utility chain ')
  .option('-p, --platform-id <number>', 'Platform Id', parseInt)
  .option('-e, --env <string>', `Environment [${envs}]`, allowedEnvs, 'staging')
  .option('-s, --sub-env <string>', `Sub Environment [${subEnvs}]`, allowedSubEnvs)
  .option('-c, --chain-id <string>', `Auxiliary Chain id to be setup`)
  .option('--ip-addresses <string>', `Comma separated EC2 ip addresses`)



  .parse(process.argv)
;

const handleError = function () {
  command.outputHelp();
  throw 'Required parameters are missing!';
};

const commonParams = {
  platformId: command.platformId,
  env: command.env,
  responseOutFile: command.responseOutFile
};

const Main = async function () {

  let performerObj = null
    , performOptions = {}
  ;

  let isMissingParams = (!command.platformId);

  if(isMissingParams){
    handleError();
  }

  console.log("commonParams: ", commonParams);

  if(command.valueInitSetup) {

    let chainId = command.chainId
      , subEnv = command.subEnv
    ;

    if(!chainId || !subEnv){
      handleError();
    }

    performerObj = new ValueInitSetup(commonParams);
    performOptions = {
      subEnv: subEnv,
      chainId: chainId,
      ipAddresses: command.ipAddresses
    };

  }
  else if(command.restart) {

    let chainId = command.chainId
      , subEnv = command.subEnv
    ;

    if(!chainId || !subEnv){
      handleError();
    }

    performerObj = new ValueChainRestart(commonParams);
    performOptions = {
      subEnv: subEnv,
      chainId: chainId,
      ipAddresses: command.ipAddresses,
    };

  }
   else {
    handleError();
  }

  console.log("performOptions: ", performOptions);
  let resp = (performerObj) ? await performerObj.perform(performOptions) : handleError();
  if(resp.err){
    throw resp;
  }

  return resp;
};

Main()
  .then(function (data) {
    console.log("\nValueChain: %s", JSON.stringify(data));
    process.exit(0);
  })
  .catch(function (err) {
    console.error('ValueChain Error: ', err);
    process.exit(1);
  })
;
