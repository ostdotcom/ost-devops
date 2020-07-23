'use strict';

const rootPrefix = '..'
  , InvokeLambdaFunction = require(rootPrefix + '/lib/aws/lambda/invoke_function')
  , Constants = require(rootPrefix + '/config/constants')
  , SystemUtil = require(rootPrefix + '/lib/utils/system')
  , ConstObj = new Constants()
;

/**
 * Partial to trigger error log entry via AWS Lambda function
 */
const RegisterAlert = {

  /**
   * Register alert via lambda function
   * @constructor
   * @param {Object} options - Service parameters
   * @param {string} options.initParams - Object init parameters
   * @param {string} options.functionName - Lambda function name
   * @param {string} options.app - Application identifier
   * @param {string} options.invokeType - Lambda function invocation type
   * @param {string} options.payload - Function payload
   * @returns {Object} App server data
   */
  register: async function (options) {

    let ec2ServiceObj =  new InvokeLambdaFunction(options.initParams);

    let resp = await ec2ServiceObj.perform({
      app: options.app,
      functionName: options.functionName,
      invokeType: options.invokeType,
      payload: JSON.stringify(options.payload)
    });

    return resp;
  },

  /**
   * Register infra alerts for further processing
   * @constructor
   * @param {Object} options - Service parameters
   * @param {string} options.initParams - Object init parameters
   * @param {string} options.env - Env identifier
   * @param {string} options.severity - Alert severity
   * @param {string} options.kind - Error entry kind
   * @param {string} options.data - Error data
   * @returns {Object} App server data
   */
  registerInfraAlert: async function (options) {
    const oThis = this;

    let payload = {
      "action": 'create_alert',
      "items": [
        {
          "appName": ConstObj.stackApp,
          "envIdentifier": options.env,
          "severity": options.severity,
          "ipAddress": ConstObj.envConstants.INFRA_IP_ADDRESS || (await SystemUtil.getIPAddress()),
          "kind": options.kind,
          "data": options.data
        }
      ]
    };

    return await oThis.register({
      initParams: options.initParams,
      functionName: 'process_app_alerts',
      app: ConstObj.stackApp,
      invokeType: 'invokeAsync',
      payload: payload
    });
  }

};

/**
 * @module services/register_alert
 */
module.exports = RegisterAlert;