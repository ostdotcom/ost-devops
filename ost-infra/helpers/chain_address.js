'use strict';

const rootPrefix = '..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , ChainAddressesModel = require(rootPrefix + '/models/chain_addresses')
;

const ChainAddressHelper = function (params) {
  const oThis = this;
  oThis.constants = new ConstantsKlass();
};

const HelperPrototype = {

  /***
   *
   ** Utility Chain Setup
   * @constructor
   * @param {Object} options - Dictionary parameters
   * @param {string} options.stackConfigId - Stack config Id
   * @param {string} options.chainId - Chain ID
   * @param {string} options.app - App ID
   * @returns {Object}
   */
  getUtilityChainAddressMap: async function (options) {
    const oThis = this;

    let masterInternalFunderAddress = null
      , sealerAddresses = []
      , stAdminAddress = null
      , stOwnerAddress = null
      ,usdcOwnerAddress = null
      , allAddrKinds = oThis.constants.dbConstants.addressKinds
      , stackConfigId = options.stackConfigId
      , chainId = options.chainId
    ;

    let addressKinds = [
      allAddrKinds.masterIntFunderKind,
      allAddrKinds.sealerKind
    ];


    let caModelResp = await oThis.getChainAddressForKinds(addressKinds, stackConfigId,options.app);

    for(let i=0;i<caModelResp.length;i++){

      let rowData = caModelResp[i];

      if(rowData['group_id'] !== chainId){
        continue;
      }

      // There should be one address with masterIntFunderKind
      if(rowData['kind'] == allAddrKinds.masterIntFunderKind){
        masterInternalFunderAddress = rowData['address'];
      } else if(rowData['kind'] == allAddrKinds.sealerKind){
        sealerAddresses.push(rowData['address']);
      } else if(rowData['kind'] == allAddrKinds.stAdminKind){
        stAdminAddress = rowData['address'];
      } else if(rowData['kind'] == allAddrKinds.stOwnerKind){
        stOwnerAddress = rowData['address'];
      }
      else if(rowData['kind'] == allAddrKinds.usdcOwnerKind) {
        usdcOwnerAddress = rowData['address'];
      }
    }

    return {
      masterInternalFunderAddress: masterInternalFunderAddress,
      sealerAddresses: sealerAddresses,
      stAdminAddress: stAdminAddress,
      stOwnerAddress: stOwnerAddress,
      usdcOwnerAddress:usdcOwnerAddress
    };
  },

  /***
   *
   * Get chain address data
   * @constructor
   * @param {Object} options - Dictionary parameters
   * @param {string} options.chainAddressIdsMap - Chain address id and ip_address mapping data
   * @param {string} options.primarySealerChainAddressId - Primary sealer chain address Id
   * @param {string} options.plainText - text used to encrypt or decrypt data
   *
   * @returns {Object}
   */
  getAddressData: async function(options) {
    const oThis = this;

    let chainAddressIdsMap = options.chainAddressIdsMap
      , primarySealerChainAddressId = options.primarySealerChainAddressId
      , plainText = options.plainText
    ;

    if(Object.keys(chainAddressIdsMap).length < 1){
      return {};
    }
    if(!plainText){
      return {};
    }
    let chainAddressIds = Object.keys(chainAddressIdsMap);

    let chainAddrModelObj = new ChainAddressesModel();
    let caModelResp = await chainAddrModelObj.getByIds(chainAddressIds);

    let returnResp = {}
      , primarySealerAddress = null
    ;

    for(let i=0;i<caModelResp.length;i++){

      let rowData = caModelResp[i];

      let itemResp = {
        address: rowData['address']
      };

      if(primarySealerChainAddressId === rowData['id']){
        primarySealerAddress = rowData['address'];
      }

      if(rowData['enc_address_data']){

        let resp = oThis.getAddressUnencryptedData(rowData['enc_address_data'], plainText);
        itemResp = Object.assign(itemResp, resp);

      }

      returnResp[chainAddressIdsMap[rowData['id']]] = itemResp;
    }

    return {chainAddressData: returnResp, primarySealerAddress: primarySealerAddress};

  },

  /***
   *
   * @param {Array} kinds - List of address type
   * @param {Number} stackConfigId - Stack Config Id
   * @param {String} :app -application ID
   * @returns {Promise<void>}
   */
  getChainAddressForKinds: async function (kinds, stackConfigId,app) {
    const oThis = this;

    // Chain address for kind
    let caModelResp = await new ChainAddressesModel().getByAppIdStackConfigIdKinds(
     app,
      stackConfigId,
      kinds
    );

    return caModelResp;
  },

  /***
   *
   * @constructor
   * @param {Object} options - Dictionary parameters
   * @param {string} options.kinds - List of db kinds
   * @param {string} options.stackConfigId - Stack Config Id
   * @param {string} options.chainId - Chain ID
   * @param {string} options.plainText - text used to encrypt or decrypt data
   * @param {string} options.app - App id
   */
  getAddressesByChainId: async function (options) {
    const oThis = this;

    let finalResp = {};
    let resp = await oThis.getChainAddressForKinds(options.kinds, options.stackConfigId,options.app);
    for(let i=0;i<resp.length;i++){

      let rowData = resp[i];
      if(parseInt(rowData['group_id']) !== parseInt(options.chainId)){
        continue;
      }

      let itemResp = {
        address: rowData['address']
      };

      if(rowData['enc_address_data']){

        let resp = oThis.getAddressUnencryptedData(rowData['enc_address_data'], options.plainText);
        itemResp = Object.assign(itemResp, resp);

      }

      finalResp[rowData['kind']] = finalResp[rowData['kind']] || [];
      finalResp[rowData['kind']].push(itemResp);
    }

    return finalResp;
  },

  getAddressUnencryptedData: function (encData, plainText) {
    const oThis = this;
    let itemResp = {};
    let addrData = new ChainAddressesModel().localCipher.decrypt(plainText, encData);
    addrData = JSON.parse(addrData);

    let addrPw = addrData[oThis.constants.chainAddressEncData.passwordKey];
    if(addrPw){
      itemResp['addressPassword'] = addrPw;
    }

    let addrPk = addrData[oThis.constants.chainAddressEncData.privateKey];
    if(addrPk){
      itemResp['addressPrivateKey'] = addrPk
    }

    return itemResp;
  }

};

Object.assign(ChainAddressHelper.prototype, HelperPrototype);
module.exports = ChainAddressHelper;
