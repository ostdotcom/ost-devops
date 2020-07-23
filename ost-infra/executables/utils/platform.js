#!/usr/bin/env node
'use strict';

const rootPrefix = '../..'
  , Constants = require(rootPrefix + '/config/constants')
  , PlatformCreate = require(rootPrefix + '/services/platform/create')
  , PlatformGetInFile = require(rootPrefix + '/services/platform/get')
  , PlatformUpdateFromFile = require(rootPrefix + '/services/platform/update')
;

const command = require('commander')
  , ConstantsObj = new Constants()
  , envs = ConstantsObj.envList()
  , subEnvs = ConstantsObj.subEnvList()
  , AWSRegions = ConstantsObj.awsRegions()
;

const allowedEnvs = eval('/(' + envs.join('|') + ')/i')
  , allowedSubEnvs = eval('/(' + subEnvs.join('|') + ')/i')
  , allowedAWSRegions = eval('/(' + AWSRegions.join('|') + ')/i')
;

command
  .version('0.1.0')
  .usage('[options]')
  .option('--response-out-file <string>', 'Response output file in form of JSON')
  .option('-c, --create', 'create platform data')
  .option('-u, --update', 'update platform data')
  .option('-g, --get', 'get platform data')
  .option('-p, --platform-id <required>', 'Platform Id', parseInt)
  .option('-a, --aws-account-id <required>', 'AWS account ID, required for create')
  .option('-r, --aws-region <required>', `AWS Regions [${AWSRegions}]`, allowedAWSRegions, 'us-east-1')
  .option('-e, --env <required>', `Environment [${envs}]`, allowedEnvs, 'staging')
  .option('-s, --sub-env <required>', `Sub Environment [${subEnvs}]`, allowedSubEnvs, 'sandbox')
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

  if(command.create){

    performerObj = new PlatformCreate(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      awsAccountId: command.awsAccountId,
      awsRegion: command.awsRegion,
    };

  } else if(command.update){

    performerObj = new PlatformUpdateFromFile(commonParams);
    performOptions = {
      subEnv: command.subEnv
    };

  } else if(command.get){

    performerObj = new PlatformGetInFile(commonParams);
    performOptions = {
      subEnv: command.subEnv,
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
    console.log("\nPLATFORM: %s", JSON.stringify(data));
    process.exit(0);
  })
  .catch(function (err) {
    console.error('PLATFORM Error: ', err);
    process.exit(1);
  })
;
