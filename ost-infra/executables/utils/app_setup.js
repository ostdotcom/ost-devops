#!/usr/bin/env node
'use strict';

const rootPrefix = '../..'
  , Constants = require(rootPrefix + '/config/constants')
  , CreateServerApp = require(rootPrefix + '/services/app_setup/create_server_app')
  , CreateEC2AppStack = require(rootPrefix + '/services/app_setup/create_app_stack')
  , UpdateAppStatus = require(rootPrefix + '/services/app_setup/update_app_status')
  , StopApp = require(rootPrefix + '/services/app_setup/stop_app')
  , StartApp = require(rootPrefix + '/services/app_setup/start_app')
  , MarkAsDeployReady = require(rootPrefix + '/services/app_setup/mark_as_deploy_ready')
  , GetAppEc2Details = require(rootPrefix + '/services/app_setup/get_app_ec2_details')

;

const command = require('commander')
  , ConstantsObj = new Constants()
  , apps = ConstantsObj.appList()
  , envs = ConstantsObj.envList()
  , subEnvs = ConstantsObj.subEnvList()
  , appTypes = ConstantsObj.appTypeList()
  , availZones = ConstantsObj.availZones()
  , ec2Statuses= ConstantsObj.ec2WaitForStatuses()
;

const allowedApps = eval('/(' + apps.join('|') + ')/i')
  , allowedEnvs = eval('/(' + envs.join('|') + ')/i')
  , allowedSubEnvs = eval('/(' + subEnvs.join('|') + ')/i')
  , allowedAppTypes = eval('/(' + appTypes.join('|') + ')/i')
  , allowedAvailZones = eval('/(' + availZones.join('|') + ')/i')
  , allowedEc2Statuses = eval('/(' + ec2Statuses.join('|') + ')/i')
;

command
  .version('0.1.0')
  .usage('[options]')
  .option('--response-out-file <string>', 'Response output file in form of JSON')
  .option('--create-server-app', 'Create app configuration')
  .option('--create-app-stack', 'Create app stack from templates')
  .option('--update-app-status', 'Update app status from AWS')
  .option('--stop-app', 'Stop Machines when not in use  ')
  .option('--start-app', 'Start Machines when not in use  ')
  .option('--mark-as-deploy-ready', 'Mark machines as deploy-ready')
  .option('--get-app-ec2-details', 'Get app ec2 details data')
  .option('--platform-id <string>', 'Platform Id', parseInt)
  .option('--env <string>', `Environment [${envs}]`, allowedEnvs, 'staging')
  .option('--sub-env <string>', `Sub Environment [${subEnvs}]`, allowedSubEnvs)
  .option('--app <string>', `Application identifier [${apps}]`, allowedApps)
  .option('--app-count <string>', `Number of Application servers required`)
  .option('--app-name <string>', `Application server name`)
  .option('--app-type <string>', `Application purpose [${appTypes}]`, allowedAppTypes)
  .option('--avail-zone <string>', `Availability zone [${availZones}]`, allowedAvailZones)
  .option('--volume-size <string>', 'EBS Volume Size')
  .option('--instance-type <string>', 'EC2 instance type')
  .option('--chain-id <string>', `Chain ID`)
  .option('--app-data <string>', `App data for cron type machines`)
  .option('--ip-addresses <string>', `Comma separated EC2 ip addresses`)
  .option('--ec2-status <string>', `EC2 statuses [${ec2Statuses}]`, allowedEc2Statuses, ConstantsObj.waitForEc2RunningStatus)
  .option('--copy-app-data-from-ip <string>', `Copy app data from the IP address`)
  .option('--app-status <string>', `To get filtered  data from app_ec2_instances.app_status`)
  .option('--exclude-jobs', `Exclude cron jobs`)

  .parse(process.argv)
;

const handleError = function (msg) {
  command.outputHelp();
  let errStr = `Required parameters are missing! - ${msg || ''}`;
  throw errStr;
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

  if(command.createServerApp) {

    if (!command.appName || !command.appType) {
      handleError();
    }

    performerObj = new CreateServerApp(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      appName: command.appName,
      appCount: command.appCount,
      appType: command.appType,
      availZone: command.availZone,
      chainId: command.chainId,
      volumeSize: command.volumeSize,
      instanceType: command.instanceType,
      appData: command.appData,
      ec2Status: command.ec2Status,
      copyAppDataFromIp: command.copyAppDataFromIp
  };

  } else if(command.createAppStack){

    performerObj = new CreateEC2AppStack(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      chainId: command.chainId,
      ec2Status: command.ec2Status,
      excludeJobs: command.excludeJobs
    };

  } else if(command.updateAppStatus) {

    performerObj = new UpdateAppStatus(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      ec2Status: command.ec2Status
    };

  } else if(command.stopApp) {

    performerObj = new StopApp(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      chainId: command.chainId,
      ipAddresses: command.ipAddresses
    };

  } else if(command.startApp) {

    performerObj = new StartApp(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      chainId: command.chainId,
      ipAddresses: command.ipAddresses
    };

  } else if(command.markAsDeployReady) {

    if(!command.subEnv || !command.app || !command.ipAddresses){
      handleError(`Either 'subEnv' or 'app' or 'ipAddresses' is absent`);
    }

    performerObj = new MarkAsDeployReady(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      ipAddresses: command.ipAddresses
    };

  } else if(command.getAppEc2Details) {

    if(!command.subEnv || !command.app){
      handleError(`Either 'subEnv' or 'app' is absent`);
    }

    performerObj = new GetAppEc2Details(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      appStatus: command.appStatus,
      ipAddresses: command.ipAddresses
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
    console.log("\nApp Setup: %s", JSON.stringify(data));
    process.exit(0);
  })
  .catch(function (err) {
    console.error('App Setup Error: ', err);
    process.exit(1);
  })
;
