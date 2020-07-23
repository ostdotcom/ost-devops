'use strict';

const rootPrefix = '../..'
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * App config upload
 * @class
 */
const AppConfigsUpload = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
  oThis.shellExec = null;
};

AppConfigsUpload.prototype = Object.create(ServiceBase.prototype);
AppConfigsUpload.prototype.constructor = AppConfigsUpload;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    options = options || {};

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_acud_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_acud_v2');
    }

    if(!options.buildNumber){
      throw oThis.getError('Invalid buildNumber!', 'err_ser_acud_v3');
    }

    let initParams = await oThis.getAppInitParams(options.subEnv);
    oThis.shellExec = new ShellExecKlass(initParams);
  },

  /**
   * Upload Service for app config
   * @constructor
   * @param {string} options.app - Application identifier
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.buildNumber - Name of the file which needs to be uploaded
   * @returns {(Object|boolean)} App Config data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;
    options = options || {};

    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    // Get Stack config data
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if(scGetServiceResp.err){
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_ac_ud_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_ac_ud_sp2');
    }

    let acRespData = acGetServiceResp['data']
      , appConfigData = acRespData[oThis.constants.appConfig.appConfigDataKey]
      , opsConfigData = acRespData[oThis.constants.appConfig.opsConfigDataKey]
    ;

    // Generate and upload config file to S3
    let stackData = scRespData[oThis.constants.platform.stackDataKey]
      , stackCommonData = scRespData[oThis.constants.platform.commonDataKey]
      , s3Bucket = stackCommonData['buildS3Bucket']
      , appConfigPath = oThis.constants.getAppConfigPath(oThis.stack, oThis.env, options.subEnv, options.app)
      , getCustomConfigPath = oThis.constants.getCustomConfigPath(oThis.stack, oThis.env, options.subEnv, options.app,options.buildNumber)
      , s3ConfigPath = `s3://${s3Bucket}/${oThis.constants.appDeploymentDir}/${appConfigPath}`
      , awsCliProfile = oThis.constants.getAwsCliProfile(oThis.stack, oThis.env, options.subEnv, options.app)
      , fileName = oThis.constants.appConfigFileName(options.app, options.buildNumber)
      , s3CustomConfigPath=`s3://${s3Bucket}/${oThis.constants.appDeploymentDir}/${getCustomConfigPath}`
    ;

    // Upload app shell config
    await oThis.generateFileAndUpload({
      configData: appConfigData,
      plainText: acRespData['plainText'],
      fileName: fileName,
      s3ConfigPath: s3ConfigPath,
      awsCliProfile: awsCliProfile,
      kmsKeyId: stackData['aws']['kmsKeyId']
    });



    if(opsConfigData['customConfigs']){
      let customConfigs=opsConfigData['customConfigs'];
      let fileNames=Object.keys(customConfigs);
      for (let i=0;i<fileNames.length; i++){
        let fileName = fileNames[i],
            fileData=customConfigs[fileName];
        await oThis.generateFileAndUpload({
          configData: fileData,
          plainText: acRespData['plainText'],
          fileName: fileName,
          s3ConfigPath: s3CustomConfigPath,
          awsCliProfile: awsCliProfile,
          kmsKeyId: stackData['aws']['kmsKeyId']
        });
      }
    }



    if(options.app === oThis.constants.ostAnalyticsApp){

      // Upload app json config (like block-scanner config)
      let configs = await oThis.Helper.appConfigs.getBlockScannerConfigs({
        platformId: oThis.stack,
        env: oThis.env,
        subEnv: options.subEnv,
        app: options.app
      });

      // Block scanner origin configs
      await oThis.generateFileAndUpload({
        configData: configs['originConfigs'],
        plainText: acRespData['plainText'],
        fileName: `origin_blockscanner_${fileName}`,
        s3ConfigPath: s3ConfigPath,
        awsCliProfile: awsCliProfile,
        kmsKeyId: stackData['aws']['kmsKeyId']
      });

      // Block scanner aux configs
      await oThis.generateFileAndUpload({
        configData: configs['auxConfigs'],
        plainText: acRespData['plainText'],
        fileName: `aux_blockscanner_${fileName}`,
        s3ConfigPath: s3ConfigPath,
        awsCliProfile: awsCliProfile,
        kmsKeyId: stackData['aws']['kmsKeyId']
      });

      // PDI Configs
      let jdbcConfigs = await oThis.Helper.appConfigs.getPDIConfigs({
        platformId: oThis.stack,
        env: oThis.env,
        subEnv: options.subEnv,
        app: options.app,
        appConfigData: appConfigData,
        opsConfigData: opsConfigData
      });

      await oThis.generateFileAndUpload({
        configData: jdbcConfigs['stringResponse'],
        plainText: acRespData['plainText'],
        fileName: `jdbc_${fileName}`,
        fileType: 'properties',
        s3ConfigPath: s3ConfigPath,
        awsCliProfile: awsCliProfile,
        kmsKeyId: stackData['aws']['kmsKeyId']
      });
    }

    return true;
  },

  /***
   *
   * @param params
   * @param {string} params.configData - Application config data
   * @param {string} params.plainText - Text used to encrypt data
   * @param {string} params.fileName - Name of the file
   * @param {string} params.fileType - File type
   * @param {string} params.s3ConfigPath - Configuration path in S3
   * @param {string} params.awsCliProfile - AWS Cli profile name
   * @param {string} params.kmsKeyId - KMS Key Id for server side encryption
   */
  generateFileAndUpload: async function (params) {
    const oThis = this
    ;

    let fileType = params.fileType || 'json';

    let encFile = await oThis.generateEncConfigFile(params);
    if(!encFile){
      throw oThis.getError(`Error generating config file`, 'err_ser_ac_ud_sp3');
    }

    let destFile = `${params.s3ConfigPath}/${params.fileName}.${fileType}.enc`;

    // Upload file
    let uploadResp = oThis.shellExec.uploadFileToS3(params.awsCliProfile, encFile, destFile, params.kmsKeyId);

    // Remove locally generated files
    await oThis.removeLocalFile(params.fileName, fileType);
    await oThis.removeLocalFile(`${params.fileName}.${fileType}`, 'enc');

    if(!uploadResp){
      throw oThis.getError(`Error uploading config file: ${params.fileName}`, 'err_ser_ac_ud_sp4');
    }
  },

  /***
   *
   * @param params
   * @param {string} params.fileName - Config file name
   * @param {string} params.fileType - File type
   * @param {string} params.configData - Application config data
   * @param {string} params.plainText - Encryption salt
   */
  generateEncConfigFile: async function (params) {
    const oThis = this
    ;

    let encodedSlat = oThis.constants.toBase64Str(oThis.constants.toBase64Str(params.plainText));

    let configFile = await oThis.generateConfigFile({
      fileName: params.fileName,
      fileType: params.fileType,
      configData: params.configData
    });
    if(!configFile){
      return false;
    }

    let encFile = oThis.shellExec.opensslEncryptFile(encodedSlat, configFile);

    return encFile
  },

  /***
   *
   * @param params
   * @param {string} params.fileName - Config file name
   * @param {string} params.configData - Application config data
   * @param {string} params.fileType - File type
   */
  generateConfigFile: async function (params) {
    const oThis = this
    ;

    let fileName = params.fileName
      , fileType = params.fileType
      , fileOpsObj = new FileOps()
    ;

    let resp = await fileOpsObj.create(fileName, params.configData, fileType);

    return resp;

  },

  removeLocalFile: async function (file, fileType) {
    const oThis = this
    ;

    let fileOpsObj = new FileOps();

    return await fileOpsObj.remove(file, fileType);
  }

};

Object.assign(AppConfigsUpload.prototype, servicePrototype);

/**
 * Upload app config data
 * @module services/app_config/upload
 */
module.exports = AppConfigsUpload;
