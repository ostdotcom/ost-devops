#!/usr/bin/env node
'use strict';

const fileFullPath = process.argv[1].split('/');
fileFullPath.length = (fileFullPath.length - 3);

const rootPrefix = fileFullPath.join('/')
  , Constants = require(rootPrefix + '/config/constants')
  , AnsibleAppSetup = require(rootPrefix + '/services/ansible/app_setup')
  , AnsibleActivateServices = require(rootPrefix + '/services/ansible/systemd_services/activate')
  , AnsibleDeactivateServices = require(rootPrefix + '/services/ansible/systemd_services/deactivate')
  , AnsibleRemoveServices = require(rootPrefix + '/services/ansible/systemd_services/remove')
  , AppBuild = require(rootPrefix + '/services/ansible/build')
  , AppDeploy = require(rootPrefix + '/services/ansible/deploy')
  , DeployStaticFiles = require(rootPrefix + '/services/ansible/deploy_static_files')
  , ServiceHandling = require(rootPrefix + '/services/ansible/service_handling')
  , DeployLambdaCode = require(rootPrefix + '/services/ansible/deploy_lambda_code_all')
  , DeployLogrotate =  require(rootPrefix + '/services/ansible/deploy_logrotate')
  , NagiosClientSetup = require(rootPrefix + '/services/ansible/deploy_nagios_client')
  , updateNagiosConfiguration= require(rootPrefix + '/services/nagios/update_nagios_configuration')
  , SendmailSetup= require(rootPrefix + '/services/ansible/sendmail_setup')
  , nagiosRemoveClientConfiguration= require(rootPrefix + '/services/nagios/nagios_remove_config')
  , DeployNginxServices= require(rootPrefix + '/services/ansible/deploy_nginx_services')
  , AddCronJobs = require(rootPrefix + '/services/ansible/add_cron_jobs')
  , configStrategy= require(rootPrefix + '/services/ansible/config_strategy')
  , RunOnetimer = require(rootPrefix + '/services/ansible/run_onetimer.js')
  , RunLogrotate= require(rootPrefix + '/services/ansible/run_logrotate.js')
  , GetFiatToFiatConversions = require(rootPrefix + '/services/get_fiat_to_fiat_conversions')

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
  .option('--app-setup', 'Setup application server for app')
  .option('--activate-services', 'Activate systemd services for apps and crons')
  .option('--deactivate-services', 'Deactivate systemd services for apps and crons')
  .option('--remove-systemd-services', 'remove systemd services for apps and crons')
  .option('--remove-cron-jobs', 'remove systemd services for apps and crons and also remove their entries from infra db ')
  .option('--build', 'Create build for application')
  .option('--deploy', 'Create build for application')
  .option('--verify-app-configs', 'Whether to verify app configs or not, only valid for production')
  .option('--deploy-static-files', 'Deploy static files for app')
  .option('--copy-exec-files', `Copy deploy executable files, Optional parameter for action -d`)
  .option('--flush-memcache','Flush memcache during restart or not ')
  .option('--flush-chain-memcache','Flush extra memcache during restart or not ')
  .option('--deploy-lambda-code', 'Deploy lambda code')
  .option('--deploy-logrotate', 'Deploy logrotate code')
  .option('--deploy-nginx-services', 'Deploy nginx ')
  .option('--sendmail-setup', 'sendmail setup ')
  .option('--run-logrotate', 'upload logs  ')
  .option('--nagios-client-setup', 'nagios_client_setup')
  .option('--nagios-update-configuration', 'nagios_client_setup')
  .option('--nagios-remove-client-configuration', 'nagios_client_setup')
  .option('--add-cron-jobs', 'Add cron jobs for app')
  .option('--add-config-strategy', 'Add config strategy  for app')
  .option('--activate-config-strategy', 'Add config strategy  for app')
  .option('--force', 'Forcefully do action')
  .option('--run-onetimer', 'Run one timer playbook for given task')
  .option('--get-conversion-from-coin-market-cap', 'Get currency conversion from coinmarketcap.com')
  .option('--github-repo <string>', 'Task name to be executed from onetimer playbook')
  .option('--config-kind <string>', 'config strategy kind to be added ')
  .option('--task-name <string>', 'Task name to be executed from onetimer playbook')
  .option('--target-env <string>', `Environment [${envs}]`, allowedEnvs)
  .option('--target-app <string>', `Application identifier [${apps}]`, allowedApps)
  .option('--target-sub-env <string>', `Sub Environment [${subEnvs}]`, allowedSubEnvs)
  .option('--target-ip-addresses <string>', `Comma separated EC2 ip addresses`)
  .option('--target-platform-id <number>', 'Platform Id', parseInt)
  .option('--target-chain-id <string>', `Auxiliary Chain id to be added to nagios server `)
  .option('--platform-id <number>', 'Platform Id', parseInt)
  .option('--env <string>', `Environment [${envs}]`, allowedEnvs, 'staging')
  .option('--sub-env <string>', `Sub Environment [${subEnvs}]`, allowedSubEnvs)
  .option('--app <string>', `Application identifier [${apps}]`, allowedApps)
  .option('--branch-name <string>', 'Git Branch name')
  .option('--build-number <string>', 'Build number for deploying app')
  .option('--chain-id <string>', `Auxiliary Chain id to be setup`)
  .option('--ip-addresses <string>', `Comma separated EC2 ip addresses`)
  .option('--service-action <string>', `Service action start|stop|restart`)
  .option('--service-name <string>','Service name or partial name')
  .option('--cron-jobs <string>','Comma separated cron jobs')
  .option('--copy-jobs-from-ip <string>', `EC2 ip address to copy jobs from`)
  .option('--app-status <string>', `Filter through App EC2 app-status, you can use '!' for negative filter`)

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

  if(command.appSetup) {
    let isMissingParams = (!command.platformId || !command.app || !command.subEnv);

    if(isMissingParams){
      handleError();
    }
    performerObj = new AnsibleAppSetup(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      ipAddresses: command.ipAddresses,
      chainId: command.chainId
    };
  }else if(command.runOnetimer) {

    let isMissingParams = (!command.platformId || !command.env || !command.subEnv);

    if(isMissingParams) {
      handleError('Either platformId or env or subEnv');
    }

    performerObj = new RunOnetimer(commonParams);
    performOptions = {
      ipAddresses: command.ipAddresses,
      taskName: command.taskName,
      subEnv: command.subEnv,
      app: command.app
    }
  }else if(command.runLogrotate) {
    let isMissingParams = (!command.platformId || !command.env ||!command.subEnv  );

    if(isMissingParams) {
      handleError();
    }

    performerObj = new RunLogrotate(commonParams);
    performOptions = {
      ipAddresses: command.ipAddresses,
      chainId:command.chainId,
      subEnv: command.subEnv,
      app: command.app
    }
  }
  else if(command.activateServices) {

    let isMissingParams = (!command.platformId || !command.app || !command.subEnv);

    if(isMissingParams){
      handleError();
    }
    performerObj = new AnsibleActivateServices(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      serviceAction: command.serviceAction,
      serviceName: command.serviceName,
      ipAddresses: command.ipAddresses,
      copyJobsFromIp: command.copyJobsFromIp,
      chainId: command.chainId
    };

  } else if(command.deactivateServices) {

    let isMissingParams = (!command.platformId || !command.app || !command.subEnv);

    if(isMissingParams){
      handleError();
    }
    performerObj = new AnsibleDeactivateServices(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      cronJobs: command.cronJobs,
      ipAddresses: command.ipAddresses
    };

  } else if(command.removeSystemdServices) {

    let isMissingParams = (!command.platformId || !command.app || !command.subEnv);

    if(isMissingParams){
      handleError();
    }

    performerObj = new AnsibleRemoveServices(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      cronJobs: command.cronJobs,
      ipAddresses: command.ipAddresses
    };

  } else if(command.removeCronJobs) {

    let isMissingParams = (!command.platformId || !command.app || !command.subEnv);

    if(isMissingParams){
      handleError();
    }

    performerObj = new AnsibleRemoveServices(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      cronJobs: command.cronJobs,
      removeCronJobs: true,
      ipAddresses: command.ipAddresses
    };

  }else if(command.build) {

    let isMissingParams = (!command.platformId || !command.app || !command.branchName);

    if(isMissingParams) {
      handleError();
    }

    performerObj = new AppBuild(commonParams);
    performOptions = {
      app: command.app,
      branchName: command.branchName,
      subEnv: command.subEnv,
      githubRepo:command.githubRepo
    };

  } else if(command.deploy) {

    let isMissingParams = (!command.platformId || !command.app || !command.buildNumber || !command.subEnv );

    if(isMissingParams) {
      handleError();
    }

    let flushOptions="";
    if (command.flushMemcache){
      flushOptions=flushOptions+"--flush-memcache"
    }
    if (command.flushChainMemcache){
      flushOptions=flushOptions+" --flush-chain-memcache"
    }

    performerObj = new AppDeploy(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      buildNumber: command.buildNumber,
      flushOptions:flushOptions,
      copyDeployExecs: command.copyExecFiles,
      ipAddresses: command.ipAddresses,
      serviceAction:  command.serviceAction,
      force: command.force,
      appStatus: command.appStatus,
      chainId:command.chainId,
      verifyAppConfigs: command.verifyAppConfigs
    };

  } else if(command.deployStaticFiles) {

    let isMissingParams = (!command.platformId || !command.app || !command.branchName || !command.subEnv );

    if(isMissingParams) {
      handleError();
    }

    performerObj = new DeployStaticFiles(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      branchName: command.branchName
    };
  } else if(command.deployNginxServices) {

    let isMissingParams = (!command.platformId || !command.app || !command.subEnv );

    if(isMissingParams) {
      handleError();
    }

    performerObj = new DeployNginxServices(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      ipAddresses: command.ipAddresses,
      serviceAction:  command.serviceAction,
      chainId:command.chainId,
      force: command.force
    };

  } else if(command.deployLambdaCode) {

    let isMissingParams = (!command.platformId || !command.app || !command.subEnv );

    if(isMissingParams) {
      handleError();
    }

    performerObj = new DeployLambdaCode(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      copyDeployExecs: command.copyExecFiles
    };

  } else if(command.deployLogrotate) {

    let isMissingParams = (!command.platformId || !command.app || !command.subEnv );

    if(isMissingParams) {
      handleError();
    }


    performerObj = new DeployLogrotate(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      ipAddresses: command.ipAddresses,
      chainId: command.chainId

    };

  }  else if(command.nagiosClientSetup) {
    let isMissingParams = (!command.platformId || !command.app || !command.subEnv );

    if(isMissingParams) {
      handleError();
    }

    performerObj = new NagiosClientSetup(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      chainId: command.chainId,
      ipAddresses: command.ipAddresses
    };

  } else if(command.sendmailSetup) {

    let isMissingParams = (!command.platformId || !command.app || !command.subEnv );

    if(isMissingParams) {
      handleError();
    }


    performerObj = new SendmailSetup(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      ipAddresses: command.ipAddresses,
    };

  } else if(command.nagiosUpdateConfiguration) {

    let isMissingParams = (!command.targetEnv || !command.targetPlatformId || !command.targetApp || !command.targetSubEnv);

    if(isMissingParams) {
      handleError('missing either one or all: targetEnv, targetPlatformId, targetApp, targetSubEnv');
    }

    let ostInfraCommonParams = {
      env: ConstantsObj.ostInfraEnv(command.targetEnv),
      platformId: ConstantsObj.ostInfraPlatform()
    };

    performerObj = new updateNagiosConfiguration(ostInfraCommonParams);

    performOptions = {
      targetSubEnv: command.targetSubEnv,
      targetApp: command.targetApp,
      targetIpAddresses: command.targetIpAddresses,
      targetPlatformId:  command.targetPlatformId,
      targetChainId: command.targetChainId,
      serviceAction: command.serviceAction,
      ipAddresses: command.ipAddresses,
      targetEnv: command.targetEnv
    };

  } else if(command.nagiosRemoveClientConfiguration) {

    let isMissingParams = (!command.targetEnv || !command.targetPlatformId || !command.targetApp || !command.targetSubEnv);

    if(isMissingParams) {
      handleError();
    }

    let ostInfraCommonParams = {
      env: ConstantsObj.ostInfraEnv(command.targetEnv),
      platformId: ConstantsObj.ostInfraPlatform()
    };

    console.log("ostInfraCommonParams: ", ostInfraCommonParams);

    performerObj = new nagiosRemoveClientConfiguration(ostInfraCommonParams);
    performOptions = {
      targetPlatformId:  command.targetPlatformId,
      targetEnv: command.targetEnv,
      targetSubEnv: command.targetSubEnv,
      targetApp: command.targetApp,
      targetIpAddresses: command.targetIpAddresses,
      targetChainId: command.targetChainId,
      serviceAction: command.serviceAction,
      force: command.force

    };

  } else if(command.serviceAction) {

    let isMissingParams = (!command.platformId || !command.app || !command.subEnv );

    if(isMissingParams) {
      handleError();
    }


    let flushOptions = '';
    if (command.flushMemcache) {
      flushOptions = flushOptions + '--flush-memcache'
    }

    if (command.flushChainMemcache) {
      flushOptions = flushOptions + ' --flush-chain-memcache'
    }

    performerObj = new ServiceHandling(commonParams);
    performOptions = {
      subEnv: command.subEnv,
      app: command.app,
      flushOptions: flushOptions,
      ipAddresses: command.ipAddresses,
      serviceAction: command.serviceAction,
      serviceName: command.serviceName,
      chainId: command.chainId,
      force: command.force
    };

  } else if(command.addCronJobs) {
    let isMissingParams = (!command.platformId || !command.app || !command.subEnv );

    if(isMissingParams) {
      handleError();
    }

    performerObj = new AddCronJobs(commonParams);
    performOptions = {
      app: command.app,
      subEnv: command.subEnv,
      ipAddresses: command.ipAddresses,
      buildNumber: command.buildNumber,
      cronJobs: command.cronJobs
    };
  } else if(command.addConfigStrategy) {
    let isMissingParams = (!command.platformId || !command.app || !command.subEnv );

    if(isMissingParams) {
      handleError();
    }
    let flushOptions="";
    if (command.flushMemcache){
      flushOptions=flushOptions+"--flush-memcache"
    }
    if (command.flushChainMemcache){
      flushOptions=flushOptions+" --flush-chain-memcache"
    }

    performerObj = new configStrategy(commonParams);
    performOptions = {
      app: command.app,
      subEnv: command.subEnv,
      buildNumber: command.buildNumber,
      kind: command.configKind,
      task: "add_config_strategy",
      activate: command.activateConfigStrategy,
      flushOptions:flushOptions
    };
  } else if(command.getFiatToFiatConversions) {

    let isMissingParams = (!command.platformId || !command.app || !command.subEnv );

    if(isMissingParams) {
      handleError('Invalid platformId or app or subEnv');
    }

    performerObj = new GetFiatToFiatConversions(commonParams);
    performOptions = {
      app: command.app,
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
    console.log("\nAnsible: %s", JSON.stringify(data), "\n\n");
    process.exit(0);
  })
  .catch(function (err) {
    console.error('Ansible Error: ', err, "\n\n");
    command.outputHelp();
    process.exit(1);
  })
;
