'use strict';

/**
 * Address Manager to generate address, private key
 *
 * @module /helpers/AddressManager
 */

const rootPrefix = '..'
  , Web3 = require('web3')
;

const AddressManager = function (params) {
  const oThis = this;
};

AddressManager.prototype = {

  generateAddress: function () {
    const web3Object = new Web3();
    let newAddress = web3Object.eth.accounts.create(web3Object.utils.randomHex(32));
    return newAddress;
  },


};

module.exports = AddressManager;
