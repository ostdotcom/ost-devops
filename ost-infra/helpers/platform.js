"use strict";

const rootPrefix = '..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , CommonUtil = require(rootPrefix + '/lib/utils/common')
;

const ostStacks = [1];
const foundationStacks = [2];
const ostPlatformStacks = [4];


const stacks = {
  ost: ostStacks,
  foundation: foundationStacks,
  ostPlatform: ostPlatformStacks,
};

let stackById = {};
let stackIds = [];

const PlatformHelper = function (params) {
  const oThis = this
  ;

  oThis.constants = new ConstantsKlass();
  oThis.utils = CommonUtil;


  function _init() {
    for(let stack in stacks){
      let ids = stacks[stack];
      for(let i=0;i<ids.length;i++){
        stackById[ids[i]] = stack;
      }
      stackIds = stackIds.concat(ids);
    }
  }

  _init();

  params = params || {};
};

const PlatformHelperPrototype = {

  // TODO: Docs
  hasValidStackData: function (stackId, stackConfigs) {
    const oThis = this
    ;

    // Stack Data
    let stackDataKeys = ['aws', 'sendMail', 'nagios', 'basicAuth'];

    let keys = Object.keys(stackConfigs[oThis.constants.platform.stackDataKey]);
    keys = keys.concat(Object.keys(stackConfigs[oThis.constants.platform.commonDataKey]));

    // Common data
    let commonDataKeys = ['buildS3Bucket', 'domain', 'logsS3Bucket'];
    let stack = stackById[stackId];
    if(stack === 'ost'){
      commonDataKeys = commonDataKeys.concat(['subDomain'])
    } else if(stack === 'ostPlatform'){
      commonDataKeys = commonDataKeys.concat(['subDomain', 'activeAuxChainIds'])
    }

    let allKeys = stackDataKeys.concat(commonDataKeys);

    let valid = true;
    for(let i=0;i<allKeys.length;i++){
      let key = allKeys[i];
      if(!keys.includes(key)){
        valid = false;
        break;
      }
    }

    return valid;

  }

};

Object.assign(PlatformHelper.prototype, PlatformHelperPrototype);
module.exports = PlatformHelper;
