'use strict';

const rootPrefix = '../..'
  , CreateErrorLogEntry = require(rootPrefix + '/lib/error_logs/create_entry')
  , ServiceBase = require(rootPrefix + '/services/service_base')
;

/**
 * Trigger lambda function to create log entry in DB
 * @class
 */
const TriggerErrorLogEntry = function(params) {
  const oThis = this;

  ServiceBase.call(oThis, params);
};

TriggerErrorLogEntry.prototype = Object.create(ServiceBase.prototype);
TriggerErrorLogEntry.prototype.constructor = TriggerErrorLogEntry;


const servicePrototype = {

  /**
   * Validate input parameters
   */
  validate: async function (options) {
    const oThis = this
    ;

    if(!oThis.constants.appList().includes(options.app)){
      throw oThis.getError('Invalid application identifier!', 'err_ser_oi_tle_v1');
    }

    if(!oThis.constants.subEnvList().includes(options.subEnv)){
      throw oThis.getError('Invalid sub-environment!', 'err_ser_oi_tle_v2');
    }

    if(!options.rawData){
      throw oThis.getError('Invalid rawData!', 'err_ser_oi_tle_v3');
    }

  },

  /**
   * Create Service for app server
   * @constructor
   * @param {Object} options - Service parameters
   * @param {string} options.subEnv - Sub environment name
   * @param {string} options.app - Application identifier
   * @param {string} options.rawData - Raw data from services like nagios
   * @returns {Object} App server data
   */
  servicePerform: async function (options) {
    const oThis = this
    ;

    let initParams = await oThis.getAppInitParams();

    let formattedArgs = oThis.formatFunctionArgs(options);

    // console.log("formattedArgs => ", formattedArgs);

    let hostname_arr = formattedArgs['HOSTNAME'].split('_');

    let ipAddress = hostname_arr[5]
      , remoteApp = hostname_arr[3]
      , envId = `${hostname_arr[0]}-${hostname_arr[1]}-${hostname_arr[2]}`
      , severity = oThis.getSeverityForEvent(formattedArgs)
      , kind = formattedArgs['SERVICECHECKCOMMAND']
    ;

    if(!severity){
      console.info("**** Skipping this alert as its not required at this point. *****");
      return true;
    }

    // console.log("ipAddress => ", ipAddress);
    // console.log("app => ", app);
    // console.log("envId => ", envId);
    // console.log("severity => ", severity);
    // console.log("kind => ", kind);

    // let resp = await AlertRegistry.register({
    //   initParams: initParams,
    //   functionName: 'process_app_alerts',
    //   app: options.app,
    //   invokeType: 'invokeAsync',
    //   payload: {
    //     "action": "create_alert",
    //     "items": [
    //       {
    //         "remoteApp": remoteApp,
    //         "appName": options.app,
    //         "envIdentifier": envId,
    //         "severity": severity,
    //         "ipAddress": ipAddress,
    //         "kind": kind,
    //         "data": formattedArgs
    //       }
    //     ]
    //   }
    // });

    let errorEntry = new CreateErrorLogEntry({
      kind: kind,
      severity: severity,
      appName: options.app,
      envIdentifier: envId,
      ipAddress: ipAddress,
      data: Object.assign({remoteApp: remoteApp}, formattedArgs)
    });

    console.log("* Raw Data => ", options.rawData);

    await errorEntry.perform().catch(function (err) {
      console.error("Error creating error log entry => ", err);
    });

    return true;
  },

  formatFunctionArgs: function (options) {

    let args = {};
    let argsArr = options.rawData.split(',').map(str => str.trim());
    for(let i=0;i<argsArr.length;i++){
      let ele = argsArr[i];
      let eleArr = ele.split('=').map(str => str.trim().replace(/["']/g, ""));
      if(eleArr[1] === '$'){
        eleArr[1]='';
      }
      args[eleArr[0]] = eleArr[1];
    }

    return args;

  },

  getSeverityForEvent: function (data) {

    let currentTS = Math.round(new Date()/1000);
    let lastServiceOKDiff = (currentTS - data['LASTSERVICEOK']);

    let severity = null;
    let message = null;
    if(data['HOSTSTATE'] === 'DOWN' && data['LASTHOSTSTATE'] === 'DOWN' && !data['SERVICEDISPLAYNAME']  ){
      // System is down
      severity = 'high';
      message = `Host (${data['HOSTNAME']}) is at state - ${data['HOSTSTATE']} and is not reachable over ICMP from nagios server`;
    } else if(data['SERVICESTATE'] !== 'OK' && data['SERVICESTATETYPE'] === 'HARD' && data['HOSTSTATE'] !== 'DOWN'){
      // Service state is not OK
      severity = 'high';
      message = `Service ${data['SERVICESTATE']} for ${data['SERVICEDISPLAYNAME']} on ${data['HOSTNAME']}. The Command executed => ${data['SERVICECHECKCOMMAND']}. No of attempts => ${data['SERVICEATTEMPT']}`;
    } else if(data['SERVICESTATE'] === 'OK' && data['SERVICESTATETYPE'] === 'HARD' && lastServiceOKDiff > 250 && data['HOSTSTATE'] !== 'DOWN'){
      // Recovery of of an earlier alert
      severity = 'low';
      message = `Recovery of service ${data['SERVICEDISPLAYNAME']} on ${data['HOSTNAME']}. The Command executed => ${data['SERVICECHECKCOMMAND']} - No of attempts => ${data['SERVICEATTEMPT']}`;
    } else if(data['SERVICESTATE'] === 'UNKNOWN'  && data['HOSTSTATE'] !== 'DOWN') {
      severity = 'medium';
      message = `${data['SERVICESTATE']} state in service ${data['SERVICEDISPLAYNAME']} on ${data['HOSTNAME']}`;
    }

    if(message){
      data['customMessage'] = message;
    }

    //
    // let severity = 'low';
    // if(data['HOSTSTATE'] !== 'UP'){
    //   severity = 'high';
    // } else if(data['SERVICESTATE'] === 'UNKNOWN'){
    //   severity = 'medium';
    // } else if(data['SERVICESTATE'] !== 'OK' && data['SERVICESTATETYPE'] === 'HARD'){
    //   severity = 'high';
    // }

    return severity;
  }

};

Object.assign(TriggerErrorLogEntry.prototype, servicePrototype);

/**
 * Trigger lambda function to create log entry in DB
 * @module services/ost_infra/trigger_log_entry
 */
module.exports = TriggerErrorLogEntry;
