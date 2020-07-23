#!/usr/bin/env node
'use strict';

const rootPrefix = '../..'
  , Constants = require(rootPrefix + '/config/constants')
  , UtilityInitSetup = require(rootPrefix + '/services/utility_chain/init_setup')
  , UtilityChainRestart = require(rootPrefix + '/services/utility_chain/restart')
  , ProposeChain = require(rootPrefix + '/services/utility_chain/propose_chain')
  , SetChainAddress = require(rootPrefix + '/services/utility_chain/set_chain_address')
  , CommonUtil = require(rootPrefix + '/lib/utils/common')

;

const command = require('commander')
  , ConstantsObj = new Constants()
  , envs = ConstantsObj.envList()
  , subEnvs = ConstantsObj.subEnvList()
  , addressKinds = ConstantsObj.dbConstants.addressKinds
  , invertedAddressKinds = Object.keys(CommonUtil.invert(addressKinds))

;

const allowedEnvs = eval('/(' + envs.join('|') + ')/i')
  , allowedSubEnvs = eval('/(' + subEnvs.join('|') + ')/i')
  , allowedaddressKinds = eval('/(' + invertedAddressKinds.join('|') + ')/i')
;

command
  .version('0.1.0')
  .usage('[options]')
  .option('--response-out-file <string>', 'Response output file in form of JSON')
  .option('--utility-init-setup', 'Setup and init Utility chain')
  .option('--set-chain-address', 'Set different address for chain, like master internal funder, st-admin, st-owner etc')
  .option('--propose-chain',`Propose Sealer `)
  .option('--restart', 'restart utility chain ')
  .option('--run-with-zero-gas', 'Start/Restart chain with zero gas price')
  .option('--genesis-init', 'Init genesis along with restart ')

  .option('--app <string>', `Application identifier utility`)
  .option('--enode-addresses <string>', `comma seperated enode  addresses`)

  .option('-p, --platform-id <number>', 'Platform Id', parseInt)
  .option('-e, --env <string>', `Environment [${envs}]`, allowedEnvs, 'staging')
  .option('-s, --sub-env <string>', `Sub Environment [${subEnvs}]`, allowedSubEnvs)
  .option('-c, --chain-id <string>', `Auxiliary Chain id to be setup`)
  .option('-a, --address <string>', `Address for kind`)
  .option('-k, --address-kind <string>', `Type of addresses [${invertedAddressKinds}]`, allowedaddressKinds)
  .option('-r, --private-key <string>', `Private key of the address`)
  .option('-w, --password <string>', `Password for address`)
  .option('-i, --ip-addresses <string>', `Comma separated EC2 ip addresses`)


  .parse(process.argv)
;

const handleError = function () {
  command.outputHelp();
  throw 'Required parameters are missing!';
};

const commonParams = {
  platformId: command.platformId,
  env: command.env,
  responseOutFile: command.responseOutFile
};

const Main = async function () {

  let performerObj = null
    , performOptions = {}
  ;

  let isMissingParams = (!command.platformId);

  if(isMissingParams){
    handleError();
  }

  console.log("commonParams: ", commonParams);

  if(command.utilityInitSetup) {

    let chainId = command.chainId
      , subEnv = command.subEnv
    ;

    if(!chainId || !subEnv|| !command.app){
      handleError();
    }

    performerObj = new UtilityInitSetup(commonParams);
    performOptions = {
      subEnv: subEnv,
      chainId: chainId,
      ipAddresses: command.ipAddresses,
      app: command.app,
    };

  }
  else if(command.restart) {

    let chainId = command.chainId
      , subEnv = command.subEnv
    ;

    if(!chainId || !subEnv){
      handleError();
    }

    performerObj = new UtilityChainRestart(commonParams);
    performOptions = {
      subEnv: subEnv,
      chainId: chainId,
      ipAddresses: command.ipAddresses,
      runWithZeroGas: command.runWithZeroGas,
      enodeAddresses:command.enodeAddresses,
      genesisInit:command.genesisInit,
      app: command.app||ConstantsObj.utilityApp
    };

  }
  else if(command.proposeChain) {

    let chainId = command.chainId
      , subEnv = command.subEnv
    ;

    if(!chainId || !subEnv){
      handleError();
    }

    performerObj = new ProposeChain(commonParams);
    performOptions = {
      subEnv: subEnv,
      chainId: chainId,
      app: command.app||ConstantsObj.utilityApp
    };


  } else if(command.setChainAddress) {
    if(!command.app){
      handleError();
    }
    let chainId = command.chainId
      , subEnv = command.subEnv
      , addressKind = command.addressKind
      , address = command.address
    ;

    if(!chainId || !subEnv || !address || !addressKind){
      handleError();
    }

    performerObj = new SetChainAddress(commonParams);
    performOptions = {
      subEnv: subEnv,
      chainId: chainId,
      address: address,
      addressKind: addressKind,
      privateKey: command.privateKey,
      password: command.password,
      app: command.app
    };

  } else {
    handleError();
  }

  console.log("performOptions: ", performOptions);
  let resp = (performerObj) ? await performerObj.perform(performOptions) : handleError();
  if(resp.err){
    throw resp;
  }

  return resp;
};

Main()
  .then(function (data) {
    console.log("\nUtilityChain: %s", JSON.stringify(data));
    process.exit(0);
  })
  .catch(function (err) {
    console.error('UtilityChain Error: ', err);
    process.exit(1);
  })
;
