'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Sendmail setup for app
 * @class
 */
const SendmailSetup = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

SendmailSetup.prototype = Object.create(ServiceBase.prototype);
SendmailSetup.prototype.constructor = SendmailSetup;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_sm_v1');
    }

    let initParams = await oThis.getAppInitParams(options.subEnv);
    oThis.shellExec = new ShellExecKlass(initParams);


  },

  /**
   * Deploy app build on app servers
   * @constructor
   * @param {Object} options - Create service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.ipAddresses - limit to ip address
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    const commonParams = {
      platformId: oThis.stack,
      env: oThis.env
    };

    // Get stack config details
    let scGetServiceObj = new PlatformGet(commonParams);
    let scGetServiceResp = await scGetServiceObj.perform({
      subEnv: options.subEnv
    });

    if(scGetServiceResp.err){
      throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_sm_sp1');
    }
    let scRespData = scGetServiceResp['data'];
    let stackData = scRespData[oThis.constants.platform.stackDataKey];




    let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
    let serviceResp = await ansibleInvObj.perform({
      subEnv: options.subEnv,
      app: options.app,
      ipAddresses: options.ipAddresses
    });

    if(serviceResp.err){
      throw oThis.getError(`Error generating ansible inventory yaml for app: ${options.app}`, 'err_ser_sm_sp2');
    }
    let serviceRespData = serviceResp['data'];

    let extraVars = {
      application:options.app,
      remote_task: 'sendmail',
      sendmail_email_addr: stackData['sendMail']['email'],
      sendmail_email_addr_pw: stackData['sendMail']['emailPw']
    };
    let groupVarsOptions={
      env: oThis.env,
      stack:oThis.stack,
      ips:options.ipAddresses
    };
    let runResp = await oThis.shellExec.runAppTasks(serviceRespData['file'], extraVars,groupVarsOptions);

    if(!runResp){
      throw oThis.getError(`Error setting sendmail for app : ${options.app}`, 'err_ser_sm_sp3');
    }

    return runResp;
  },

};

Object.assign(SendmailSetup.prototype, servicePrototype);

/**
 * sendmail setup
 * @module services/ansible/sendmail_setup
 */
module.exports = SendmailSetup;
