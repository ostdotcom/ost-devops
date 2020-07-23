'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Restart value chain and
 * @class
 */
const VCRestart = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

VCRestart.prototype = Object.create(ServiceBase.prototype);
VCRestart.prototype.constructor = VCRestart;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_vc_r_v1');
    }

    if(!options.chainId){
      throw oThis.getError('Invalid chainId!', 'err_ser_vc_r_v2');
    }


  },

  /**
   * Restart value node
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.chainId - Chain Id
   * @param {string} options.ipAddresses - Comma separated machine IPs
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
      throw oThis.getError(`Error while fetching stack configs info`, 'err_ser_vc_r_sp1');
    }
    oThis.stackData = scGetServiceResp['data'];


    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: oThis.stackData['id'],
      app: oThis.constants.valueApp,
      chainId: options.chainId,
      plainText: oThis.stackData['plainText'],
      ipAddresses: options.ipAddresses
    });

    if (inventoryData['ec2Data'].length < 1) {
      throw oThis.getError(`Error getting inventorydata`, 'err_ser_vc_r_sp2');

    }

    // Generate ansible inventory yaml for app
    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: oThis.constants.valueApp,
      chainId: options.chainId,
      inventoryData: inventoryData
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml`, 'err_ser_vc_r_sp3');
    }

    let serviceRespData = serviceResp['data'];

    let extraVars = {
      task: 'restart',
      application: oThis.constants.valueApp,
      env: oThis.env,
      chain_id: options.chainId
    };

    let shellExec = new ShellExecKlass();
    let runResp = shellExec.runValueTask(serviceRespData['file'], extraVars, options.ipAddresses);

    return runResp;

  }

};

Object.assign(VCRestart.prototype, servicePrototype);

/**
 * Restart value node
 * @module services/ansible/value_chain/restart
 */
module.exports = VCRestart;