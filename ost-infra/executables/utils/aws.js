#!/usr/bin/env node
'use strict';

const rootPrefix = '../..'
  , Constants = require(rootPrefix + '/config/constants')
  , LambdaUpdateCode = require(rootPrefix + '/services/aws/lambda/update_code')
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
  .option('--lambda-update-code', 'Update lambda function code for app')
  .option('--platform-id <number>', 'Platform Id', parseInt)
  .option('--env <string>', `Environment [${envs}]`, allowedEnvs, 'staging')
  .option('--sub-env <string>', `Sub Environment [${subEnvs}]`, allowedSubEnvs)
  .option('--app <string>', `Application identifier [${apps}]`, allowedApps)
  .option('--branch-name <string>', 'Git Branch name')
  .parse(process.argv)
;

const handleError = function (msg) {
  command.outputHelp();
  let errStr = `Required parameters are missing! - ${msg || ''}`;
  throw errStr;
};

const commonParams = {
  platformId: command.platformId,
  env: command.env
};

const Main = async function () {

  let performerObj = null
    , performOptions = {}
  ;

  let isMissingParams = (!command.platformId || !command.app);

  if(isMissingParams){
    handleError('Either platformId or app is missing.');
  }

  console.log("commonParams: ", commonParams);

  if(command.lambdaUpdateCode) {

    let branchName = command.branchName
    ;

    if(!branchName ){
      handleError();
    }

    performerObj = new LambdaUpdateCode(commonParams);
    performOptions = {
      app: command.app,
      branchName: branchName,
      subEnv: command.subEnv
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
    console.log("\nAWS: %s", JSON.stringify(data));
    process.exit(0);
  })
  .catch(function (err) {
    console.error('AWS Error: ', err);
    command.outputHelp();
    process.exit(1);
  })
;
