'use strict';

const rootPrefix = '../..'
  , EC2ServiceCreate = require(rootPrefix + '/lib/aws/ec2/create_instance')
  , EC2InstanceModel = require(rootPrefix + '/models/ec2_instances')
  , AppEC2InstanceModel = require(rootPrefix + '/models/app_ec2_instances')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , AddressManager = require(rootPrefix + '/helpers/AddressManager.js')
  , ChainAddressesModel = require(rootPrefix + '/models/chain_addresses')
  , SetChainAddress = require(rootPrefix + '/services/utility_chain/set_chain_address')
;

/**
 * Create app server
 * @class
 */
const CreateAppServer = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

CreateAppServer.prototype = Object.create(ServiceBase.prototype);
CreateAppServer.prototype.constructor = CreateAppServer;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_ca_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_ca_v2');
    }

    if(!oThis.constants.appTypeList().includes(options.appType)){
      throw oThis.getError('Invalid appType!', 'err_ser_as_ca_v3');
    }

    if(!options.appName || options.appName == ''){
      throw oThis.getError('Invalid appName!', 'err_ser_as_ca_v4');
    }

    if(!oThis.constants.availZones().includes(options.availZone)){
      throw oThis.getError('Invalid availZone!', 'err_ser_as_ca_v5');
    }

    if(options.volumeSize < 15){
      throw oThis.getError('Invalid volumeSize!', 'err_ser_as_ca_v6');
    }

    if(options.app === oThis.constants.utilityApp && (!options.chainId)){
      throw oThis.getError('Invalid chainId for utility app!', 'err_ser_as_ca_v7');
    }

    if(options.app === oThis.constants.valueApp && options.chainId != oThis.constants.getOriginChainId(oThis.env,options.subEnv)){
      throw oThis.getError('Invalid chainId for value app!', 'err_ser_as_ca_v8');
    }
    options.chainId = options.chainId || '';
    options.appData = options.appData || {};

    if(!oThis.Helper.appEC2.validateAppData(options.appData, options.app)){
      throw oThis.getError(`Invalid app data for app: ${options.app}!`, 'err_ser_as_ca_v9');
    }

  },

  /**
   * Create Service for app server
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.appType - Purpose of the application server
   * @param {string} options.appName - Application server name
   * @param {string} options.availZone - AWS Availability zone
   * @param {string} options.volumeSize - AWS EBS Volume Size
   * @param {string} options.instanceType - AWS EC2 instance type
   * @param {string} options.chainId - Group id if there is any? (in case of utility chain specific machines)
   * @param {string} options.appData - App inventory specific data
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

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
      throw oThis.getError(`Error while fetching stack configs info for app: ${options.app}`, 'err_ser_ca_sp1');
    }
    oThis.scRespData = scGetServiceResp['data'];

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_ca_sp1.1');
    }

    let acRespData = acGetServiceResp['data']
      , opsConfigData = acRespData[oThis.constants.appConfig.opsConfigDataKey]
    ;

    // Get ec2 request params
    let templateParams = oThis.utils.clone(oThis.constants.ec2RequestTemplate(oThis.env));
    let appTypeParams = templateParams[options.appType];
    appTypeParams = oThis.constants.formatJson(
      appTypeParams,
      Object.assign(options, {nodeType: options.appData.nodeType})
    );

    // Add chain info for tags
    if(options.chainId){
      appTypeParams['group'] = options.chainId;
    }

    let initParams = await oThis.getAppInitParams(options.subEnv);

    // Get snapshotId based on ops config flag
    let snapshotData = await oThis.Helper.appSetup.getLatestSnapshotIdForApp({
      app: options.app,
      chainId: options.chainId,
      opsConfigData: opsConfigData,
      awsInitParams: initParams
    });

    if(!snapshotData){
      throw oThis.getError(`Error while getting latest snapshot for app: ${options.app}`, 'err_ser_ca_sp2');
    }

    if(snapshotData.hasOwnProperty('dataVolume')){
      appTypeParams['dataVolSnapId'] = snapshotData['dataVolume'];
    }

    // Create instance
    let ec2ServiceObj =  new EC2ServiceCreate(initParams);
    let createResp = await ec2ServiceObj.perform(appTypeParams);

    if(createResp.err){
      throw oThis.getError(`Error while creating EC2 instance for : ${options.app}`, 'err_ser_ca_sp3');
    }

    let respData = createResp['data']
      , instanceData = respData['Instances'][0]
      , Ec2ModelObj = new EC2InstanceModel()
    ;

    let modelResp = await Ec2ModelObj.create({
      instanceId: instanceData['InstanceId'],
      ipAddress: instanceData['PrivateIpAddress'],
      data: instanceData,
      status: instanceData['State']['Name']
    });

    if(!modelResp['insertId']){
      throw oThis.getError(`Error creating ec2_instance table entry for : ${options.app}`, 'err_ser_ca_sp4');
    }

    // create entry for api and web
    let ec2Apps = oThis.constants.appsServerList(options.app)
      , webAppsForApis = oThis.constants.webAppsForApis()
    ;

    for(let i=0;i<ec2Apps.length;i++){
      let appData=JSON.parse((JSON.stringify(options.appData)));
      let appId = ec2Apps[i];

      if(webAppsForApis.includes(appId) && ( options.appType === 'cron' || appData['is_socket_server'] )){
        continue;
      }
      if(webAppsForApis.includes(appId)){
        appData = {};
      }
      appData = Object.assign({role: options.appType}, appData);
      appData=await oThis.Helper.appEC2.formatAppDataJobs(appData,options.app);
      let chainAddressData = await oThis.createChainAddress(options);
      appData = Object.assign(appData, chainAddressData);
      let appEC2ModelObj = new AppEC2InstanceModel();
      let appEC2ModelResp = await appEC2ModelObj.create({
        stackConfigId: oThis.scRespData['id'],
        stackId: oThis.scRespData['stackId'],
        env: oThis.env,
        subEnv: options.subEnv,
        appId: appId,
        ec2InstanceId: modelResp['insertId'],
        groupId: options.chainId,
        ipAddress: instanceData['PrivateIpAddress'],
        appData: appData
      });

      if(!appEC2ModelResp['insertId']){
        return false;
      }
    }

    return {ipAddress: instanceData['PrivateIpAddress']};
  },

  createChainAddress: async function (options) {
    const oThis = this;

    if(options.app !== oThis.constants.utilityApp){
      return {};
    }

    let appData = options.appData;
    if (appData['nodeType'] !== 'sealerNode') {
      return {};
    }

    //Create entry in chain address table and appdata for utility
    let AddressManagerObj = new AddressManager()
      ,chainAddrModelObj = new ChainAddressesModel()
    ;

    let response = AddressManagerObj.generateAddress();
    let addrPassword = oThis.utils.generatePassphrase(16);

    let setChainAddrObj = new SetChainAddress({
      platformId: oThis.stack,
      env: oThis.env
    });

    let setChainAddrResp = await setChainAddrObj.perform({
      subEnv: options.subEnv,
      chainId: options.chainId,
      addressKind: oThis.constants.dbConstants.addressKinds.sealerKind,
      address: response['address'],
      privateKey: response['privateKey'],
      password: addrPassword,
      app:options.app
    });

    if(setChainAddrResp.err){
      throw oThis.getError(`Error creating sealer address entry for chain: ${options.chainId}`, 'err_ser_ca_cca1');
    }
    let setChainAddrRespData = setChainAddrResp['data'];

    return {chainAddressId: setChainAddrRespData['id']};
  }

};

Object.assign(CreateAppServer.prototype, servicePrototype);

/**
 * Create app server
 * @module services/app_setup/_create_app
 */
module.exports = CreateAppServer;
