'use strict';

const rootPrefix = '../..'
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , DeployLambdaCode = require(rootPrefix + '/services/ansible/deploy_lambda_code')

;

/**
 * Deploy lambda code for app
 * @class
 */
const DeployLambdaCodeAll = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

DeployLambdaCodeAll.prototype = Object.create(ServiceBase.prototype);
DeployLambdaCodeAll.prototype.constructor = DeployLambdaCodeAll;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(options.app !== oThis.constants.saasApiApp){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_dlc_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_dlc_v2');
    }

    let initParams = await oThis.getAppInitParams(options.subEnv);

    options.copyDeployExecs = options.copyDeployExecs || false;

  },

  /**
   * Deploy app build on app servers
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {boolean} options.copyDeployExecs - Whether to Copy deploy executable files or not
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @returns Boolean Status of Lambda deployment
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    // Get app config data
    let acGetServiceObj = new AppConfigGet(commonParams);
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: options.app
    });

    if(acGetServiceResp.err){
      throw oThis.getError(`Error fetching configurations for app: ${options.app}`, 'err_ser_as_dla_sp1');
    }

    let auxConfigs=acGetServiceResp['data']['opsConfigData']['auxConfigs'];
    let  performerObj = new DeployLambdaCode(commonParams);
    for (let i in auxConfigs )
    {
      options.chainId=auxConfigs[i]['chainId'];
      let runResp= await  performerObj.perform(options);
      if(runResp.err){
        throw resp;
      }
    }
    return true;

  },

};

Object.assign(DeployLambdaCodeAll.prototype, servicePrototype);

/**
 * Deploy lambda code for app
 * @module services/ansible/deploy_lambda_code
 */
module.exports = DeployLambdaCodeAll;