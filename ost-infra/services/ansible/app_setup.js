'use strict';

const rootPrefix = '../..'
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Generate ansible inventory yml
 * @class
 */
const AnsibleAppSetup = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

AnsibleAppSetup.prototype = Object.create(ServiceBase.prototype);
AnsibleAppSetup.prototype.constructor = AnsibleAppSetup;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_cas_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_cas_v2');
    }

    oThis.infraWorkspacePath = oThis.constants.infraWorkspacePath();
    oThis.envPlatformPath = oThis.constants.getEnvPlatformPath(oThis.stack, oThis.env, options.subEnv, options.app);
    oThis.configDirPath = oThis.constants.getAppConfigPath(oThis.stack, oThis.env, options.subEnv, options.app);


    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }

  },

  /**
   * Setup app via ansible
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.setupNagiosServer - Whether to setup pentaho BI server or not
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @param {string} options.chainId - Group id if there is any?
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    let filesToDelete = [];

    // Get Stack config data
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if(scGetServiceResp.err || !scGetServiceResp.data){
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_aaps_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_aaps_sp2');
    }
    let acRespData = acGetServiceResp['data']
      , appCommonConfigs = acRespData[oThis.constants.appConfig.commonConfigDataKey]
      , opsCommonConfigs = acRespData[oThis.constants.appConfig.opsConfigDataKey]
    ;

    let stackData = scRespData[oThis.constants.platform.stackDataKey]
      , stackCommonData = scRespData[oThis.constants.platform.commonDataKey]
      , ansibleData = stackCommonData['ansible'] || {}
    ;

    // Generate KMS cipher file for app
    let resp = await oThis.generateCipherTextBlobFile(options, acRespData['cipherTextBlob']);
    if(!resp){
      throw oThis.getError(`Error generating cipherTextBlob file for app: ${options.app}`, 'err_ser_aaps_sp3');
    }
    filesToDelete.push(resp);

    // Generate app common config file
    resp = await oThis.generateAppCommonConfigFile(options, appCommonConfigs);
    if(!resp){
      throw oThis.getError(`Error generating common configuration file for app: ${options.app}`, 'err_ser_aaps_sp4');
    }
    filesToDelete.push(resp);
    if (oThis.constants.subDomainCheck(options.app) && !opsCommonConfigs['subDomain']){
      throw oThis.getError(`Error subDomain is missing `, 'err_ser_aaps_sp5');
    }
    // Generate local_constants data and file
    let extraVars = {
      "env": oThis.env,
      "application": options.app,
      "platform": oThis.stack ,
      "sub_env":options.subEnv,
      "sendmail_email_addr": stackData['sendMail']['email'],
      "sendmail_email_addr_pw": stackData['sendMail']['emailPw'],
      "domain": stackCommonData['domain'],
      "sub_domain": opsCommonConfigs['subDomain'],
      "s3_bucket_logs": 's3://'+ stackCommonData['logsS3Bucket'],
      "local_config_path": `${oThis.infraWorkspacePath}/${oThis.configDirPath}`,
      "devops_s3_bucket": stackCommonData['buildS3Bucket'],
      "nrpePort": stackData['nagios']['nrpePort'],
      "aws_region": scRespData['awsRegion'],
      "chainId": options.chainId,
      "logsDirPath": oThis.constants.logDirPaths(options.app,ansibleData['profileType']),
      // "setup_local_cache":  oThis.constants.localMemcacheRequired(options.app,oThis.env),
      "apply_on_hosts": options.subEnv
    };
    if (oThis.constants.isRabbitApp().includes(options.app)){
      extraVars["rabbit_username"]=appCommonConfigs['rmqUserName'] ;
      extraVars["rabbit_password"]=appCommonConfigs['rmqPassword'];
    }
    if (oThis.constants.isQaApp().includes(options.app)){
      extraVars["qa_setup"]=true;
    }

    let inventoryData = await oThis.Helper.appEC2.getAppEC2DataForAppSetup({
      stackConfigId: scRespData['id'],
      app: options.app,
      ipAddresses: options.ipAddresses,
      plainText: scRespData['plainText'],
      chainId: options.chainId
    });

    if (inventoryData['ec2Data'].length < 1) {
      console.log(`********** No active inventory data present for app: ${options.app} **********`);
      return true;
    }
    let extraData = {};
    let nagiosServer=false;
    for (let i=0;i< inventoryData['ec2Data'].length;i++) {
      let rowData=inventoryData['ec2Data'][i];
      if(rowData['app_data']['nagios_server']){
        nagiosServer=true;
        break ;
      }
    }
    if(nagiosServer){
      extraData['task'] = 'nagios_server_setup';
    }
    extraData['env']= oThis.env;
    if(stackData['basicAuth']['user'] && stackData['basicAuth']['password']){
      Object.assign(extraVars, {"basic_auth_user": stackData['basicAuth']['user'], "basic_auth_password": stackData['basicAuth']['password']});
    }

    // Get App specific configs for setup
    let appSpecificConfigs = oThis.Helper.ansible.getAppSpecificConfigsForSetup({
      stackConfigs: scRespData,
      appConfigs: acRespData,
      app: options.app,
      extraData: extraData
    });

    // Files to create
    let filesData = appSpecificConfigs['filesData'];
    let fileResp = {};

    if(options.app === oThis.constants.ostAnalyticsApp){

      if(!filesData){
        throw oThis.getError(`Error generating app specific setup files for app: ${options.app}`, 'err_ser_aaps_sp6');
      }

    } else if(options.app === oThis.constants.stackApp && nagiosServer){

      if(!filesData){
        throw oThis.getError(`Error generating app specific setup files for app: ${options.app}`, 'err_ser_aaps_sp7');
      }

      // extra vars for nagios tasks
      let nagiosExtraVars = {
        nagiosBasicAuthUserName: stackData['nagios']['basicAuthUserName'],
        nagiosBasicAuthPassword: stackData['nagios']['basicAuthPassword']
      };
      Object.assign(extraVars, nagiosExtraVars)

    }
    let fileOpsObj = new FileOps();
    fileResp = await fileOpsObj.generateAppSpecificSetupFiles(filesData,oThis.infraWorkspacePath);
    Object.assign(extraVars, fileResp);

    filesToDelete = filesToDelete.concat(Object.values(fileResp));

    // Generate ansible inventory yaml for app
    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      inventoryData: inventoryData
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml for app: ${options.app}`, 'err_ser_aaps_sp9');
    }

    let serviceRespData = serviceResp['data'];

    // Run ansible command/script
    let initParams = await oThis.getAppInitParams(options.subEnv)
      , shellExec = new ShellExecKlass(initParams)
    ;

    let runResp = shellExec.runAnsibleAppSetup(serviceRespData['file'], extraVars);
    if(!runResp){
      throw oThis.getError('ansible app setup failed', 'err_ser_aaps_sp10');
    }

    // Update app setup status
    let updateResp = await oThis.Helper.appEC2.updateAppEC2AppStatusToSetupDone(inventoryData['ec2Data']);

    // Remove locally generated setup files
    await fileOpsObj.removeLocalFiles(filesToDelete);

    return runResp;

  },

  generateCipherTextBlobFile: async function (options, data) {
    const oThis = this
    ;

    let cipherTextFileName = oThis.constants.appConfigCipherFileName
      , fileOpsObj = new FileOps()
    ;

    let resp = await fileOpsObj.createFileForPath(`${oThis.infraWorkspacePath}/${oThis.configDirPath}`, cipherTextFileName, 'enc', data);
    return resp;
  },

  generateAppCommonConfigFile: async function (options, data) {
    const oThis = this
    ;

    let cipherTextFileName = oThis.constants.appCommonConfigFileName(options.app)
      , fileOpsObj = new FileOps()
      , bashVars = oThis.convertJsonToBash(data)
    ;

    let resp = await fileOpsObj.createFileForPath(`${oThis.infraWorkspacePath}/${oThis.configDirPath}`, cipherTextFileName, 'sh', bashVars);
    return resp;
  },



};


Object.assign(AnsibleAppSetup.prototype, servicePrototype);

/**
 * Setup app from ansible
 * @module services/ansible/app_setup
 */
module.exports = AnsibleAppSetup;
