#!/usr/bin/env node
'use strict';

const fileFullPath = process.argv[1].split('/');
fileFullPath.length = (fileFullPath.length - 3);
const rootPrefix = fileFullPath.join('/');

const Constants = require(rootPrefix + '/config/constants')
  , AppConfigCreate = require(rootPrefix + '/services/app_config/create')
  , AppConfigGetInFile = require(rootPrefix + '/services/app_config/get')
  , AppChainConfigGetInFile = require(rootPrefix + '/services/app_config/saasApi/get_chain_configs')
  , AppConfigUpdate = require(rootPrefix + '/services/app_config/update')
;

const command = require('commander')
  , ConstantsObj = new Constants()
  , apps = ConstantsObj.appList()
  , envs = ConstantsObj.envList()
  , subEnvs = ConstantsObj.subEnvList()
;

const allowedApps = eval('/(' + apps.join('|') + ')/i')
  , allowedEnvs = eval('/(' + envs.join('|') + ')/i')
  , allowedSubEnvs = eval('/(' + subEnvs.join('|') + ')/i')
;

command
  .version('0.1.0')
  .usage('[options]')
  .option('--response-out-file <string>', 'Response output file in form of JSON')
  .option('--create', 'Create app configuration')
  .option('--update', 'Update app configuration')
  .option('--upload', 'Update app configuration')
  .option('--get', 'Get app configuration')
  .option('--get-chain-configs', 'Get app configuration')
  .option('--platform-id <number>', 'Platform Id', parseInt)
  .option('--env <string>', `Environment [${envs}]`, allowedEnvs, 'staging')
  .option('--sub-env <string>', `Sub Environment [${subEnvs}]`, allowedSubEnvs)
  .option('--app <string>', `Application identifier [${apps}]`, allowedApps)
  .option('--chain-id <number>', 'Chain Id (For global config use chainId: 0)')
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

  let isMissingParams = (!command.platformId || !command.app);

  if(isMissingParams){
    handleError();
  }

  console.log("commonParams: ", commonParams);

  if(command.create){

    performerObj = new AppConfigCreate(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app
    };

  } else if(command.update){

    performerObj = new AppConfigUpdate(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app
    };

  } else if(command.get){

    performerObj = new AppConfigGetInFile(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      getInFile: true
    };

  } else if(command.getChainConfigs){

    performerObj = new AppChainConfigGetInFile(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      chainId: command.chainId,
      getInFile: true
    };

  } else {
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
    console.log("\nApp Config: %s", JSON.stringify(data));
    process.exit(0);
  })
  .catch(function (err) {
    console.error('App Config Error: ', err);
    process.exit(1);
  })
;
