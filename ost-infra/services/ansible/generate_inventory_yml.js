'use strict';

const rootPrefix = '../..'
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Setup app via ansible
 * @class
 */
const GenerateInventoryYml = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

GenerateInventoryYml.prototype = Object.create(ServiceBase.prototype);
GenerateInventoryYml.prototype.constructor = GenerateInventoryYml;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_a_giy_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_a_giy_v2');
    }

    if(options.app === oThis.constants.utilityApp && !options.chainId){
        throw oThis.getError('Chain Id not defined !', 'err_ser_a_giy_v3');
    }

    options.lightInventory = options.lightInventory || false;
    if(options.ipAddresses){
      options.ipAddresses = options.ipAddresses.split(',').map(str => str.trim());
    }
  },

  /**
   * Generate ansible inventory file for app
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.chainId - Chain Id
   * @param {boolean} options.lightInventory - Whether to generate light inventory file or not
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @param {string} options.inventoryData - Object containing app ec2 data, enodes data and chain address data
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
      throw oThis.getError(`Error while fetching stack configs info`, 'err_ser_as_uc_is_sp1');
    }
    let scRespData = scGetServiceResp['data']
      , stackCommonData = scRespData[oThis.constants.platform.commonDataKey]
    ;

    // Get App EC2 servers data for inventory generation
    let inventoryData = null;
    if(options.inventoryData){
      inventoryData = options.inventoryData;
    } else {
      inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
        stackConfigId: scRespData['id'],
        app: options.app,
        chainId:options.chainId,
        ipAddresses: options.ipAddresses
      });
    }

    if(inventoryData.ec2Data.length < 1){
      throw oThis.getError(`No active EC2 instances found for app: ${options.app}`, 'err_ser_giy_sp2');
    }

    // Required for ost analytics jobs
    inventoryData['activeAuxChainIds'] = stackCommonData['activeAuxChainIds'];

    if(Array.isArray(options.ipAddresses) && inventoryData.ec2Data.length !== options.ipAddresses.length){
      throw oThis.getError(`No active EC2 instances with ips (${options.ipAddresses}) found for app: ${options.app}`, 'err_ser_giy_sp3');
    }

    let file = await oThis.generateInventoryFile(options, inventoryData);

    if(!file){
      throw oThis.getError(`Error generating inventory yaml file for app: ${options.app}`, 'err_ser_giy_sp4');
    }

    let fileOpsObj = new FileOps();
    let sourceGroupVars= `${oThis.constants.devOpsRoot()}/ansible/inventories/${oThis.env}/group_vars`;
    let destGroupVars=oThis.constants.ansibleGroupVarsDirPath(oThis.stack, oThis.env);
    let groupVarsDir=await fileOpsObj.copyDir(sourceGroupVars,destGroupVars);
    if(!groupVarsDir){
      throw oThis.getError(`Error generating group vars: ${options.app}`, 'err_ser_giy_sp5');
    }
    return {file: file};

  },

  generateInventoryFile: async function (options, inventoryData) {
    const oThis = this
    ;

    let appEC22InstanceResp = inventoryData['ec2Data']
      , chainAddressData = inventoryData['chainAddressData']
      , activeAuxChainIds = inventoryData['activeAuxChainIds']
    ;

    // Generate inventory data
    let inventoryAddresses = oThis.Helper.ansible.generateInventoryData({
      env: oThis.env,
      subEnv: options.subEnv,
      app: options.app,
      inventoryData: appEC22InstanceResp,
      chainAddressData: chainAddressData,
      lightInventory: options.lightInventory,
      uniqueRunId: oThis.uniqueRunId,
      activeAuxChainIds: activeAuxChainIds
    });
    if(Object.keys(inventoryAddresses).length<1){
      throw oThis.getError('inventoryAddresses is empty  !', 'err_ser_a_gif_v1');
    }
    let inventoryJson = oThis.Helper.ansible.baseInventoryHierarchy(
      options.subEnv, options.app, inventoryAddresses
    );

    let dirPath = oThis.constants.ansibleInventoryFilePath(oThis.stack, oThis.env)
      , filename = oThis.constants.ansibleInventoryFileName(options.app)
      , fileOpsObj = new FileOps()
    ;

    // Get yaml data from json
    let yamlResp = fileOpsObj.jsonToYaml(inventoryJson);

    let resp = await fileOpsObj.createFileForPath(dirPath, filename, 'yml', yamlResp);

    return resp;
  },

};

Object.assign(GenerateInventoryYml.prototype, servicePrototype);

/**
 * Generate ansible inventory file
 * @module services/ansible/generate_inventory_yml
 */
module.exports = GenerateInventoryYml;
