'use strict';

const rootPrefix = '../..'
  , ChainAddressHelper = require(rootPrefix + '/helpers/chain_address')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ProposeSealer = require(rootPrefix + '/services/utility_chain/propose_sealer.js')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * * Propose all utility nodes for chain
 * @class
 */
const UCProposeChain = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

UCProposeChain.prototype = Object.create(ServiceBase.prototype);
UCProposeChain.prototype.constructor = UCProposeChain;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_uc_pc_v1');
    }

    if(!options.chainId){
      throw oThis.getError('Invalid chainId!', 'err_ser_uc_pc_v2');
    }
    if(![oThis.constants.utilityApp].includes(options.app)){
      throw oThis.getError('Invalid app !', 'err_ser_uc_pc_v3');
    }

  },

  /**
   * ProposeSealer  - Propose Sealers
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.chainId - Chain Id
   * @param {string} options.app  - App Id
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
      throw oThis.getError(`Error while fetching stack configs info`, 'err_ser_uc_pc_sp1');
    }
    let scRespData = scGetServiceResp['data'];

    // Propose sealer from chain addresses for chain id
    let ChainAddressHelperObj = new ChainAddressHelper();
    // let chainAddressRows = await ChainAddressHelperObj.getChainAddressForKinds([oThis.constants.dbConstants.addressKinds.sealerKind], scRespData['id']);
    let chainAddressRows = await  ChainAddressHelperObj.getUtilityChainAddressMap({stackConfigId: scRespData['id'], chainId: options.chainId,app:options.app});
    let sealerAddresses=chainAddressRows['sealerAddresses'];
    let proposeSealerObj = new ProposeSealer(commonParams);

    for (let i = 0; i < sealerAddresses.length; i++) {

      let address = sealerAddresses[i];

      let resp = await proposeSealerObj.perform({
        subEnv: options.subEnv,
        chainId: options.chainId,
        address: address,
        app:options.app,
        proposeType: true
      });

      if(resp.err){
        throw oThis.getError(`Error proposing address ${address}`, 'err_ser_uc_pc_sp2');
      } else {
        console.log(`************ Propose success for chain: ${options.chainId} - Address: ${address} ************`);
      }

    }

    return true;

  }

};

Object.assign(UCProposeChain.prototype, servicePrototype);

/**
 * Propose all utility nodes for chain
 * @module services/ansible/utility_chain/UCProposeChain
 */
module.exports = UCProposeChain;
