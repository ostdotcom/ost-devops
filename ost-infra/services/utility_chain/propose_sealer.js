'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
;

/**
 * ProposeSealer  utility chain
 * @class
 */
const ProposeSealer = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

ProposeSealer.prototype = Object.create(ServiceBase.prototype);
ProposeSealer.prototype.constructor = ProposeSealer;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;
    oThis.shellExec = new ShellExecKlass();

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_uc_ps_v1');
    }

    if(!options.chainId){
      throw oThis.getError('Invalid chainId!', 'err_ser_uc_ps_v2');
    }
    if(![oThis.constants.utilityApp].includes(options.app)){
      throw oThis.getError('Invalid app !', 'err_ser_uc_ps_v3');
    }

  },

  /**
   * ProposeSealer  - Propose Sealers
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.chainId - Chain Id
   * @param {string} options.address - Address that needs to be proposed
   * @param {string} options.proposeType - Propose type
   * @param {string} options.app -- Application name
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this;

    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    // Get Stack config data
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if (scGetServiceResp.err) {
      throw oThis.getError(`Error while fetching stack configs info`, 'err_ser_uc_ps_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    // Get App EC2 servers data for inventory generation
    let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
      stackConfigId: scRespData['id'],
      app: options.app,
      chainId: options.chainId,
      plainText: scRespData['plainText']

    });

    if(inventoryData['primarySealerAddress'] === options.address){
      return true;
    }
    let filteredInventoryData = inventoryData;
    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      chainId: options.chainId,
      inventoryData: filteredInventoryData
    });

    if (serviceResp.err) {
      throw oThis.getError(`Error generating ansible inventory yaml`, 'err_ser_uc_ps_sp3');
    }
    let serviceRespData = serviceResp['data'];

    let extraVars = {
      application: options.app,
      task: 'propose_sealer',
      propose_address: options.address,
      propose_type: options.proposeType,
      chain_id: options.chainId,
    };

    let shellExec = new ShellExecKlass();
    let runResp = shellExec.runUtilityTask(serviceRespData['file'], extraVars);
    if (!runResp) {
      throw oThis.getError(`Error Error executing utility task`, 'err_ser_uc_ps_sp4');
    }

    return runResp;
  }

};

Object.assign(ProposeSealer.prototype, servicePrototype);

/**
 * ProposeSealer utility chain services
 * @module services/ansible/utility_chain/chain_restart.js
 */
module.exports = ProposeSealer;
