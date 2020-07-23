'use strict';

const rootPrefix = '../..'
  , ShellExecKlass = require(rootPrefix + '/lib/utils/shell_executor')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , ServiceBase = require(rootPrefix + '/services/service_base')
  , GenerateAnsibleInventory = require(rootPrefix + '/services/ansible/generate_inventory_yml')

;

/**
 * Generate ansible inventory yml
 * @class
 */
const RunLogrotate = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

RunLogrotate.prototype = Object.create(ServiceBase.prototype);
RunLogrotate.prototype.constructor = RunLogrotate;

  const servicePrototype = {

    /**
     * Validate input parameters
     */
    validate: async function (options) {
      const oThis = this;
      if(!oThis.constants.appList().includes(options.app)){
        throw oThis.getError('Invalid application identifier!', 'err_ser_as_rlg_v1');
      }
      if(!oThis.constants.subEnvList().includes(options.subEnv)){
        throw oThis.getError('Invalid sub-environment!', 'err_ser_as_rlg_v2');
      }
      oThis.shellExec = new ShellExecKlass();

    },

    /**
     * Deploy app build on app servers
     * @param {Object} options - Create service parameters
     * @param {string} options.app - env name
     * @param {string} options.subEnv - subEnv name
     * @param {string} options.ipAddresses - comma seperated ips where  the changes are to be applied
     * @param {string} options.chainId - Chain ID
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

      if (scGetServiceResp.err || !scGetServiceResp.data) {
        throw oThis.getError(`Error fetching stack configurations for app: ${options.app}`, 'err_ser_as_rlg_sp1');
      }
      let scRespData = scGetServiceResp['data']
        , stackCommonData = scRespData[oThis.constants.platform.commonDataKey]
        , ansibleData = stackCommonData['ansible'] || {}
        ;

      let groupVarsOptions = {
        env: oThis.env,
        stack: oThis.stack,
        ips: options.ipAddresses
      };

      // Apply log rotate on apps
      let ec2Apps = oThis.constants.appsServerList(options.app);
      for(let i=0;i<ec2Apps.length;i++){

        let app = ec2Apps[i];
        let logDir = oThis.constants.logDirPaths(app, ansibleData['profileType']);

        // Generate local_constants data and file
        let extraVars = {
          "remote_task": 'run_logrotate',
          "env": oThis.env,
          "application": app,
          "platform": oThis.stack,
          "sub_env": options.subEnv,
          "logsDirPath": logDir.join(','),
          "s3_bucket_logs": 's3://' + stackCommonData['logsS3Bucket']
        };

        let inventoryData = await oThis.Helper.appEC2.getAppEC2Data({
          stackConfigId: scRespData['id'],
          app: app,
          plainText: scRespData['plainText'],
          ipAddresses: options.ipAddresses
        });

        if (inventoryData['ec2Data'].length < 1) {
          console.log(`*************** No active inventory found for app: ${app} ***************`);
          continue;
        }

        let ansibleInvObj = new GenerateAnsibleInventory(commonParams);
        let serviceResp = await ansibleInvObj.perform({
          subEnv: options.subEnv,
          app: app,
          inventoryData:inventoryData,
          chainId: options.chainId
        });

        if (serviceResp.err) {
          throw oThis.getError(`Error generating ansible inventory yaml for app: ${app}`, 'err_ser_as_rlg_sp3');
        }
        let serviceRespData = serviceResp['data'];

        let runResp = await oThis.shellExec.runAppTasks(serviceRespData['file'], extraVars, groupVarsOptions);
        if (!runResp) {
          throw oThis.getError(`Error running  temp tasks for platform : ${oThis.stack} env:${ oThis.env}`, 'err_ser_as_rlg_sp4');
        }

      }

      return true;
    },
  };


Object.assign(RunLogrotate.prototype, servicePrototype);

/**
 * Setup app from ansible
 * @module services/ansible/RunLogrotate
 */
module.exports = RunLogrotate;
