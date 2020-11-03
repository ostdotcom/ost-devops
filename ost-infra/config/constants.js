"use strict";

const rootPrefix = '..'
  , EnvConstants = require(rootPrefix + '/config/env_constants')
  , DBConstants = require(rootPrefix + '/config/db_constants')
  , AnsibleConstants = require(rootPrefix+'/config/ansible/inventory_vars')
  , format = require("string-template")
  , jsonTemplaterObject = require('json-templater/object')
  , path = require('path')
  , NagiosConstants=require(rootPrefix+'/config/nagios_constants.json')
;

const AppConstants = function (params) {
  const oThis = this
  ;

  params = params || {};
};

AppConstants.prototype = {

  ostWebApp: 'ostWeb',
  ostPrototypesApp: 'ostPrototypes',
  ostOrgApp: 'ostOrg',
  cmsWebApp: 'cmsWeb',
  mappyWeb: 'mappyWeb',
  cmsApiApp: 'cmsApi',
  apiDocsApp: 'apiDocs',
  utilityApp: 'utility',
  valueApp: 'value',
  ostAnalyticsApp:"ostAnalytics",
  saasApiRabbitApp:'rabbitSaasApi',
  apiApp: 'api',
  webApp: 'web',
  saasApiApp: 'saasApi',
  viewApp: 'ostView',
  stackApp: 'ostInfra',
  mappyApi: 'mappyApi',

  devopsEmailId: 'devops@ost.com',
  envConstants: EnvConstants,
  nagiosConstants: NagiosConstants,
  dbConstants: DBConstants,
  ansible: AnsibleConstants,
  configStrategyKey: 'configStrategy',
  platform: {
    stackDataKey: 'stackData',
    commonDataKey: 'commonData'
  },

  appConfig: {
    commonConfigDataKey: 'commonConfigData',
    appConfigDataKey: 'appConfigData',
    opsConfigDataKey: 'opsConfigData',
  },

  chainAddressEncData: {
    privateKey: 'addressPrivateKey',
    passwordKey: 'addressPassword'
  },

  appConfigCipherFileName: 'kms_cipher',
  localConstantsFileName: 'local_constants',
  appDeploymentDir: 'app_deployments',

  ec2PendingStatuses: ['pending'],
  ec2ActiveStatuses: ['running'],
  ec2InActiveStatuses: ['shutting-down', 'terminated'],
  ec2StoppedStatuses: ['stopping','stopped'],

  waitForEc2TerminatedStatus: 'instanceTerminated',
  waitForEc2StoppedStatus: 'instanceStopped',
  waitForEc2RunningStatus: 'instanceRunning',
  waitForEc2InstanceOkStatus: 'instanceStatusOk',

  buildS3Bucket: "devops.stagingost.com",

  utilityGasPrice: '0x3B9ACA00',

  getRemoteUser(app){
    const oThis = this;
    let remoteUser = "centos";
    return remoteUser;
  },
  getPlatformDataFileName: function (platform, env, subEnv) {
    return `platform_${platform}_${env}_${subEnv}`;
  },
  identifierReq: function(app) {
    const oThis = this;
    if ([oThis.saasApiApp].includes(app)){
      return true;
    }else {
      return false;
    }
  },
  getAppConfigDataFileName: function (platform, env, subEnv, app) {
    const oThis = this;

    if(oThis.isMultiSubEnvApp(app)){
      return `platform_${platform}_${env}_${subEnv}_${app}`;
    } else {
      return `platform_${platform}_${env}_${app}`;
    }
  },

  getAppSetupResponseDataFileName: function (platform, env, subEnv, app) {
    const oThis = this;

    if(oThis.isMultiSubEnvApp(app)){
      return `ec2_app_setup_${platform}_${env}_${subEnv}_${app}`;
    } else {
      return `ec2_app_setup_${platform}_${env}_${app}`;
    }
  },

  // Common helper methods

  appList: function () {
    const oThis = this;
    return [oThis.ostWebApp, oThis.ostOrgApp, oThis.cmsWebApp,oThis.mappyWeb, oThis.cmsApiApp, oThis.apiDocsApp, oThis.webApp, oThis.apiApp, oThis.saasApiApp, oThis.viewApp, oThis.utilityApp, oThis.valueApp, oThis.ostAnalyticsApp,oThis.stackApp,oThis.mappyApi, oThis.saasApiRabbitApp, oThis.ostPrototypesApp];
  },
  isBuildDeployRequired: function(){
    const oThis = this;
    return [oThis.ostWebApp, oThis.ostOrgApp, oThis.cmsWebApp,oThis.mappyWeb, oThis.cmsApiApp, oThis.webApp, oThis.apiApp, oThis.saasApiApp, oThis.viewApp, oThis.ostAnalyticsApp,oThis.stackApp,oThis.mappyApi];
  },
  isSystemdActivationRequired: function(){
    const oThis = this;
    return [oThis.ostWebApp, oThis.ostOrgApp, oThis.cmsWebApp, oThis.mappyWeb, oThis.cmsApiApp, oThis.webApp, oThis.apiApp, oThis.saasApiApp, oThis.viewApp, oThis.ostAnalyticsApp,oThis.stackApp,oThis.mappyApi, oThis.utilityApp, oThis.saasApiRabbitApp];
  },
  isConfigStrategyRequired: function (){
    const oThis = this;
    return [oThis.saasApiApp]
  },

  configStrategyFileName: function(app){
    const oThis = this;
    return `${app}_configStrategy`;
  },

  isStaticFilesDeployApp: function (app) {
    const oThis = this;
    return [oThis.ostPrototypesApp].includes(app);
  },

  isRabbitApp: function () {
    const oThis = this;
    return [oThis.saasApiRabbitApp];
  },
  isQaApp: function () {
    const oThis = this;
    return [];
  },
  webAppsForApis: function(){
    const oThis = this;
    return [oThis.webApp, oThis.cmsWebApp,oThis.mappyWeb];
  },

  kitInterfaceApps: function () {
    const oThis = this;
    return [oThis.webApp, oThis.apiApp];
  },

  cmsInterfaceApps: function () {
    const oThis = this;
    return [oThis.cmsWebApp, oThis.cmsApiApp];
  },
  mappyInterfaceApps: function () {
    const oThis = this;
    return [oThis.mappyWeb, oThis.mappyApi];
  },
  appsServerList: function (app) {
    const oThis = this;

    if(oThis.kitInterfaceApps().includes(app)){
      return oThis.kitInterfaceApps();
    } else if(oThis.cmsInterfaceApps().includes(app)){
      return oThis.cmsInterfaceApps();
    } else if(oThis.mappyInterfaceApps().includes(app)){
      return oThis.mappyInterfaceApps();
    }else {
      return [app];
    }
  },

  appTypeList: function () {
    return ['app', 'cron'];
  },
  subDomainCheck: function(app){
    const oThis = this;
    if(app === oThis.utilityApp || app === oThis.saasApiRabbitApp || app === oThis.stackApp ){
      return false;
    }
    return true;
  },
  envList: function () {
    return ['staging', 'production', 'development'];
  },

  ec2WaitForStatuses:function () {
    const oThis = this;
    return [oThis.waitForEc2RunningStatus, oThis.waitForEc2InstanceOkStatus, oThis.waitForEc2StoppedStatus];
  },

  subEnvList: function () {
    return ['sandbox', 'main'];
  },

  awsRegions: function () {
    return ['us-east-1', 'eu-west-1'];
  },

  availZones: function () {
    return ['1a', '1b', 'public_1a', 'public_1b'];
  },

  formatStr: function (str, map) {
    return format(str, map);
  },

  formatJson: function (json, map) {
    return jsonTemplaterObject(json, map);
  },

  isWebTypeApp: function (app) {
    const oThis = this;
    return [oThis.webApp, oThis.viewApp, oThis.ostWebApp, oThis.ostOrgApp, oThis.cmsWebApp, oThis.mappyWeb].includes(app);
  },

  isNodeJSApp: function (app) {
    const oThis = this;
    return [oThis.saasApiApp, oThis.viewApp, oThis.mappyWeb, oThis.ostAnalyticsApp].includes(app);
  },

  isRailsApp: function (app) {
    const oThis = this;
    return [oThis.webApp, oThis.apiApp, oThis.ostWebApp, oThis.ostOrgApp, oThis.cmsWebApp, oThis.cmsApiApp, oThis.mappyApi].includes(app);
  },

  isMultiSubEnvApp: function (app) {
    const oThis = this;
    return [oThis.webApp, oThis.apiApp, oThis.saasApiApp, oThis.viewApp, oThis.utilityApp, oThis.ostAnalyticsApp, oThis.valueApp].includes(app);
  },

  isCronEntryRequiredOnRemoteApp: function (app) {
    const oThis = this;
    return [oThis.saasApiApp].includes(app);
  },

  getEnvPlatformPath: function (platform, env, subEnv, app) {
    const oThis = this;
    let path = `configs/${env}/platform_${platform}`;
    if(oThis.isMultiSubEnvApp(app)){
      path = `${path}/${subEnv}`
    }

    return path;
  },

  getNagiosConfigFileName: function(options){
    const oThis = this;
    let namePrefix='';
    if ((options.targetApp === oThis.utilityApp ||  oThis.isRabbitApp().includes(options.targetApp)) && options.targetChainId ){
      namePrefix = `p${options.targetPlatformId}_${options.targetEnv}_${options.targetSubEnv}_${options.targetApp}_chain${options.targetChainId}`
    } else {
      namePrefix = `p${options.targetPlatformId}_${options.targetEnv}_${options.targetSubEnv}_${options.targetApp}`
    }
    return namePrefix;
  },
  getNagiosServices: function (env,app) {
    const oThis = this;
    let services=require(rootPrefix+'/templates/nagios/'+env+'/services.json');
    services= oThis.formatJson(services,
      {
        application: app
      }
    );
    return services;
  },
  getNagiosAppServiceMapping: function (env) {
    const oThis = this;
    let appServiceMapping=require(rootPrefix+'/templates/nagios/'+env+'/app_service_mappings.json');
    return appServiceMapping;
  },

  getAppConfigPath: function (platform, env, subEnv, app) {
    const oThis = this;
    let path = oThis.getEnvPlatformPath(platform, env, subEnv, app);
    return `${path}/${app}`;
  },
  getCustomConfigPath: function (platform, env, subEnv, app,buildNumber) {
    const oThis = this;
    let path = oThis.getEnvPlatformPath(platform, env, subEnv, app);
    return `${path}/${app}/customConfigs_${buildNumber}`;
  },
  getAppBuildPath: function (app) {
    return `builds/${app}`;
  },

  toBase64Str: function (str) {
    return Buffer.from(str).toString('base64');
  },

  getAwsCliProfile: function (platform, env, subEnv, app) {
    const oThis = this;

    let str = `profile-${platform}-${env}`;
    if(oThis.isMultiSubEnvApp(app)){
      return `${str}-${subEnv}-${app}`
    } else {
      return `${str}-${app}`
    }
  },

  ec2RequestTemplate: function (env) {
    return require(rootPrefix + `/templates/app_setup/ec2_request_template`);
  },

  appStackTemplate: function (env) {
    return require(rootPrefix + `/templates/app_setup/${env}/app_stack_template`);
  },

  devOpsRoot: function () {
    const oThis = this;
    return path.resolve(oThis.appRoot(), '..');
  },

  appRoot: function () {
    return path.resolve(__dirname, '..');
  },
  ostInfraPlatform: function (){
    return 1;
  },
  ostInfraEnv: function (targetEnv){
    if(targetEnv === 'staging'){
      return 'staging'
    } else {
      return 'production';
    }
  },
  ostInfraSubEnv: function () {
    return 'main';
  },
  infraWorkspacePath: function () {
    const oThis = this;
    return `${oThis.envConstants.INFRA_WORKSPACE}`;
  },

  infraAppLogsDir: function () {
    const oThis = this;
    return oThis.ansible.appLogsDir(oThis.stackApp);
  },

  infraAppCurrentPath: function () {
    const oThis = this;
    return oThis.ansible.currentPath(oThis.stackApp);
  },

  ansibleInventoryFilePath: function (platform, env) {
    const oThis = this;
    return `${oThis.infraWorkspacePath()}/inventories/${env}/platform_${platform}`
  },

  ansibleGroupVarsDirPath: function (platform, env) {
    const oThis = this;
    return `${oThis.infraWorkspacePath()}/inventories/${env}/platform_${platform}`
  },

  ansibleInventoryFileName: function (app) {
    return `${app}_servers`;
  },
  ansibleAllInventoryFileName:function (platformId,env) {
    return `platform${platformId}_${env}_all_servers`;
  },
  appExecutorFileName: function (app, uniqueId) {
    return `${app}_executor_${uniqueId}`;
  },

  appCommonConfigFileName: function (app, chainId) {

    let fileName = `${app}_common_vars`;
    if(chainId){
      fileName = `${fileName}_${chainId}`;
    }

    return fileName
  },

  localBuildsPath: function () {
    const oThis = this;
    return `${oThis.infraWorkspacePath()}/rpm_builds`;
  },

  appConfigFileName: function (app, buildNumber) {
    return `${app}_${buildNumber}`;
  },

  getOriginChainId: function (env, subEnv) {
    if(env === 'production' && subEnv === 'main'){
      return 1;
    } else {
      return 3;
    }
  },

  ec2DefaultVolumeSize: function (env, subEnv) {
    if(env === 'production' && subEnv === 'main'){
      return 15;
    } else {
      return 15;
    }
  },
  getEnodeFileName: function (chainId) {
    const oThis = this;
    let fileName= `enodes_${chainId}`;
    return fileName;
  },

  ec2DefaultInstanceType: function (env, subEnv) {
    if(env === 'production' && subEnv === 'main'){
      return 't3a.xlarge';
    } else {
      return 't3a.micro';
    }
  },

  availableAppDataKeys: function (app) {
    const oThis = this;

    let appDataKeys = [
      {key: 'jobs', keyType: 'list'},
      {key: 'role'}
    ];

    if(app === oThis.apiApp) {
      appDataKeys.push(
        {key: 'redis_server_required', keyType: 'boolean'},
        {key: 'sidekiq_required', keyType: 'boolean'},
        {key: 'setup_local_cache', keyType: 'boolean'}
        );
    } else if (app === oThis.utilityApp) {
      appDataKeys.push(
        {key: 'nodeType'},
        {key: 'isPrimarySealer', keyType: 'boolean'}
        );
    } else if(app === oThis.ostAnalyticsApp){
      appDataKeys.push(
        {key: 'setupPentahoBIServer', keyType: 'boolean'}
      );
    } else if(app === oThis.stackApp){
      appDataKeys.push(
        {key: 'nagios_server', keyType: 'boolean'}
      );
    }


    return appDataKeys;
  },

  ucGenesisFileName: function (chainId) {
    return `${chainId}_genesis`;
  },

  lambdaCodeS3Bucket: function (env) {
    if(env == 'production'){
      return 'lambda-libs-eu.ost.com';
    }
    return 'lambda-libs.stagingost.com';
  },

  localMemcacheRequired: function (app,env) {
    const oThis=this;
    return false;
  },
  lambdaCodeS3FilePath: function (platform, env, subEnv, chainId) {
    const oThis = this;
    return `${oThis.envPlatform(platform, env)}/${subEnv}/${chainId}`;
  },

  lambdaFunctionNameForDDBToES: function (platform, env, subEnv, app, chainId) {
    const oThis = this;
    return `${oThis.envPlatform(platform, env)}_${subEnv}_${app}_${chainId}_DDB_to_ES`;
  },

  lambdaFunctionARN: function (region, accountId) {
    const oThis = this;
    return `arn:aws:lambda:${region}:${accountId}:function`;
  },

  envPlatform: function (platform, env) {
    return `${env[0]}${platform}`;
  },

  isMultiConfigApp: function (app) {
    const oThis = this;
    if(app === oThis.ostAnalyticsApp){
      return true;
    }

    return false;
  },

  configTemplatePath: function (app) {
    const oThis = this;
    return `${oThis.appRoot()}/config/templates/${app}`
  },

  pentahoBIServerHeapSizes: function (env) {
    if(env === 'staging'){
      return {
        initialHeapSize: 2048,
        maximumHeapSize: 4096
      }
    } else {
      return {
        initialHeapSize: 2048,
        maximumHeapSize: 4096
      }
    }
  },

  ansibleSystemdState: function (action) {
    if(action === 'start'){
      return 'started';
    } else if (action === 'stop'){
      return 'stopped';
    } else if (action === 'restart'){
      return 'restarted';
    }
  }
  ,

  logDirPaths: function (app, profileType) {
    const oThis = this;
    let logDir=[];
    logDir.push(oThis.ansible.appLogsDir(app, profileType));

    if(!oThis.webAppsForApis().includes(app)) {
      logDir.push(oThis.ansible.nginxLogsDir());
      logDir.push(oThis.ansible.gethLogsDir());
      logDir.push(oThis.ansible.pentahoLogsDir());

    }

    return logDir;
  }

};

module.exports = AppConstants;
