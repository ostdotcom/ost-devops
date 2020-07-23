'use strict';

const rootPrefix = '../..'
  , CreateAppService = require(rootPrefix + '/services/app_setup/_create_app')
  , UpdateAppServerStatusService = require(rootPrefix + '/services/app_setup/update_app_status')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Create app server stack
 * @class
 */
const CreateAppServerStack = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

CreateAppServerStack.prototype = Object.create(ServiceBase.prototype);
CreateAppServerStack.prototype.constructor = CreateAppServerStack;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_as_cas_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_as_cas_v2');
    }
    options.chainId = options.chainId || '';
    if((options.app === oThis.constants.utilityApp || options.app === oThis.constants.saasApiApp ) && !options.chainId){
      throw oThis.getError('Group id is absent!', 'err_ser_as_cas_v3');
    }

    if(options.app === oThis.constants.valueApp && options.chainId != oThis.constants.getOriginChainId(oThis.env,options.subEnv)){
      throw oThis.getError('Group id is absent!', 'err_ser_as_cas_v4');
    }

  },

  /**
   * Create Service for app server stack
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.chainId - Application group
   * @param {string} options.ec2Status - ec2 expected status
   * @param {Boolean} options.excludeJobs - Whether to exclude jobs or not
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this;
    if(oThis.constants.webAppsForApis().includes(options.app)){
      console.log("********** No need of app_setup for 'web' type interface apps, instead create 'api' type app **********");
      return true;
    }
    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    // Create app stack params from template
    let appParamsArr = oThis.createAppParamsFromTemplate(options);

    // Create app server
    let createAppSerObj = new CreateAppService(commonParams)
      , serviceRespArr = []
    ;
    for(let i=0;i<appParamsArr.length;i++){
      let appParams = appParamsArr[i];
      if(appParams.hasOwnProperty(options.subEnv)){
        appParams = Object.assign(appParams, appParams[options.subEnv]);
      }
      console.log("\n***** Create EC2 instance for following parameters *****\n", appParams, "\n");
      let resp = await createAppSerObj.perform(appParams);
      if(resp.err){
        throw oThis.getError(`Error creating EC2 app for app: ${options.app}`, 'err_ser_as_cas_sp1');
      }

      serviceRespArr.push(resp.data);
    }
    // Update app server status
    let updateStatusSerObj = new UpdateAppServerStatusService(commonParams)
      , updateStatusSerResp = await updateStatusSerObj.perform({subEnv: options.subEnv, app: options.app, ec2Status: options.ec2Status})
    ;

    return {ec2Instances: serviceRespArr};

  },

  createAppParamsFromTemplate: function (options) {
    const oThis = this;

    // Get stack template
    let template = oThis.utils.clone(oThis.constants.appStackTemplate(oThis.env)[options.app])
      , reqParamsArr = []
    ;

    for(let appType in template){

      let commonVars = {
        subEnv: options.subEnv,
        app: options.app,
        appType: appType
      };

      let appTypeTemplate = template[appType];
      appTypeTemplate= oThis.constants.formatJson(appTypeTemplate,
        {
          chainId: options.chainId
        }
      );

      for(let i=0;i<appTypeTemplate.length;i++){

        let templateVars = appTypeTemplate[i]
          , ec2Params = templateVars['ec2RequestParams']
          , appData = templateVars['appData']
        ;

        if(appData){
          if(options.excludeJobs){
            delete appData["jobs"];
          }

          commonVars['appData'] = appData;
        }

        reqParamsArr.push(Object.assign({}, commonVars, ec2Params));
      }
    }

    return reqParamsArr;
  }

};

Object.assign(CreateAppServerStack.prototype, servicePrototype);

/**
 * Create app server stack
 * @module services/app_setup/create_app_stack
 */
module.exports = CreateAppServerStack;
