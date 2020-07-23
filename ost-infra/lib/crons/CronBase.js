const rootPrefix = '../..'
  , Constants = require(rootPrefix + '/config/constants')
  , CommonUtil = require(rootPrefix + '/lib/utils/common')
  , Helper = require(rootPrefix + '/helpers/index')
  , CreateErrorLogEntry = require(rootPrefix + '/lib/error_logs/create_entry')
  , PlatformGet = require(rootPrefix + '/services/platform/get')
  , AppConfigGet = require(rootPrefix + '/services/app_config/get')
  , AWSConnection = require(rootPrefix + '/services/aws/aws_connection')

;

/**
 * Class for sigint handler.
 *
 * This class has 2 responsibilities
 * 1. sigint handling
 * 2. cron processes table queries and validations
 *
 * @class CronBase
 */
class CronBase {
  /**
   * Constructor for sigint handler.
   *
   * @param {object} params
   *
   * @constructor
   */
  constructor(platformId, env, subEnv, app) {
    const oThis = this;

    oThis.stack = platformId;
    oThis.env = env;
    oThis.subEnv = subEnv;
    oThis.app = app;

    oThis.appConfigs = null;
    oThis.platformConfigs = null;
    oThis.canExit = true;

    oThis.Helper = Helper;
    oThis.utils = CommonUtil;
    oThis.constants = new Constants();

    oThis.attachHandlers(); // Attaching handlers from sigint handler.
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<>}
   */
  //TODO:: pass runDuration, sleepTime
  async perform(options) {
    const oThis = this;

    let errObj;
    oThis.continuous = options.continuous;
    oThis.runningDuration = options.runningDuration || (30 * 60 * 1000);
    oThis.setExitTimeout(oThis.runningDuration);


    if (oThis.continuous) {
      await oThis.performContinuous(options)
        .then(function (data) {
          return oThis.onSuccess(data);
        })
        .catch(async function (err) {
          console.log("cronBase catch performContinuous:::: ",err);
          return await oThis.onFailure(err);
        });
    } else {
      await oThis.performNonContinuous(options)
        .then(function (data) {
          return oThis.onSuccess(data);
        })
        .catch(async function (err) {
          console.log("cronBase catch performNonContinuous:::: ",err);
          return await oThis.onFailure(err);
        });
    }
  }

  /**
   * data to be returned on success
   * @param data
   * @returns {Promise<void>}
   */
  async onSuccess(data) {
    const oThis = this;

    return Promise.resolve({success: true, data: data});
  }

  /**
   * error handling on failure
   * @param err
   * @returns {Promise<void>}
   */
  async onFailure(obj) {
    const oThis = this;

    let errObj;
    let code;
    if (obj.hasOwnProperty('err')) {
      errObj = new Error();
      errObj.code = obj.code;
      errObj.message = obj.err;
    } else {
      errObj = obj;
      errObj.baseCode = 'l_c_cb_1';
      if (!errObj.code) {
        errObj.code = errObj.baseCode;
      }
    }
    errObj.errorName = `${oThis.constructor.name}Error`;

    await oThis.registerInfraAlertForHighSeverity({kind: errObj.code, data: errObj});

    return Promise.reject({success: false, err: errObj});
  }

  /**
   * Validate parameters
   * @param options -
   * @returns {Promise<never>}
   */
  async validate(options) {
    const oThis = this;

    if (typeof oThis.continuous === "undefined") {
      return Promise.reject(oThis.getError('Invalid cronType !', 'err_cron_bas_v_v1'));
    }
    if (!oThis.env) {
      return Promise.reject(oThis.getError('Invalid environment!', 'err_cron_bas_v_v2'));
    }
    if (!oThis.stack) {
      return Promise.reject(oThis.getError('Invalid platform!', 'err_cron_bas_v_v3'));
    }
    if (!oThis.constants.appList().includes(oThis.app)) {
      return Promise.reject(oThis.getError('Invalid application identifier!', 'err_cron_bas_v_v4'));
    }

    if (!oThis.constants.subEnvList().includes(oThis.subEnv)) {
      return Promise.reject(oThis.getError('Invalid sub-environment!', 'err_cron_bas_v_v5'));
    }
  }


  /**
   * This functions task is for continuous running crons
   * @param options
   * @returns {Promise<void>}
   */
  async performContinuous(options) {
    const oThis = this;

    await oThis.validate(options);
    oThis.sleepTime = options.sleepTime;
    while (!oThis.stopProcessingWork) {

      await oThis.asyncPerform(options);

      // Sleep for some time
      await oThis.sleep(oThis.sleepTime);

    }

    return Promise.resolve(true);
  }

  /**
   * This functions task is for one time crons
   * @param options
   * @returns {Promise<void>}
   */
  async performNonContinuous(options) {
    const oThis = this;

    await oThis.validate(options);

    return oThis.asyncPerform(options);
  }


  /**
   * Attach SIGINT/SIGTERM handlers to the current process.
   */
  attachHandlers() {
    const oThis = this;

    let notifierCalled = false;
    let errObj;


    /**
     * Send error notification function.
     * If cron doesn't stop after 60 secs of receiving SIGINT, send error notification.
     */
    const sendNotification = async function () {
      console.error("Cron not stopped even after 30 sec... ");
      errObj = oThis.getError('Cron not stopped even after 30 sec', 'err_cron_bas_b_sn1');
      await oThis.registerInfraAlertForHighSeverity({kind: errObj.code, data: errObj});

      process.exit(1);
    };

    /**
     * Handler for SIGINT and SIGTERM signals.
     */
    const handle = async function () {

      if (oThis.stopProcessingWork === false) {
        oThis._stopProcessingTasks();
      }
      // We need to call notifier only once.
      if (!notifierCalled) {
        setTimeout(sendNotification, 30000);
        notifierCalled = true;
      }
      if (oThis.canExit) {
        console.log(':: No pending tasks.exiting process');
        process.exit(0);
      } else {
        console.log(':: There are pending tasks. Waiting for completion.');
        setTimeout(handle, 2000);
      }

    };
    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  }

  /**
   * Stops consumption upon invocation
   */
  _stopProcessingTasks() {
    const oThis = this;

    console.log(':: _stopProcessingTasks called');

    oThis.stopProcessingWork = true;
  }

  getError(msg, code) {
    const oThis = this;

    return {
      err: msg,
      code: code
    }
  }

  /**
   * Register infra alerts for further processing
   * @constructor
   * @param {Object} options - Service parameters
   * @param {string} options.severity - Alert severity
   * @param {string} options.kind - Error entry kind
   * @param {string} options.data - Error data
   * @returns {Object} App server data
   */
  async registerInfraAlert(options) {
    const oThis = this;

    if (!oThis.constants.envConstants.INFRA_IP_ADDRESS) {
      return false;
    }

    let errorEntry = new CreateErrorLogEntry({
      kind: options.kind,
      severity: options.severity,
      appName: oThis.constants.stackApp,
      envIdentifier: oThis.env,
      ipAddress: oThis.constants.envConstants.INFRA_IP_ADDRESS,
      data: options.data
    });

    await errorEntry.perform().catch(function (err) {
      console.error("Error creating error log entry => ", err);
    });

    return true;
  }

  async getAppInitParams(subEnv) {
    const oThis = this
    ;

    if (oThis.awsConnectionParams) {
      return oThis.awsConnectionParams;
    }

    let awsConnObj = new AWSConnection();
    let awsConnParams = await awsConnObj.getConnectionParams({
      stack: oThis.stack,
      env: oThis.env,
      subEnv: subEnv
    });

    oThis.awsConnectionParams = Object.assign({stack: oThis.stack, env: oThis.env, subEnv: subEnv}, awsConnParams);

    return oThis.awsConnectionParams;
  }


  async getPlatformConfigs() {
    const oThis = this;

    if (oThis.platformConfigs) {
      return oThis.platformConfigs;
    } else {

      // Get Stack config data
      const commonParams = {
        platformId: oThis.stack,
        env: oThis.env
      };
      let scGetServiceObj = new PlatformGet(commonParams);
      let scGetServiceResp = await scGetServiceObj.perform({
        subEnv: oThis.subEnv
      });

      if (scGetServiceResp.err) {
        return Promise.reject(oThis.getError(`Error while fetching stack configs info for app: ${oThis.app}`, 'err_cron_bas_gpc_5'));
      }

      oThis.platformConfigs = scGetServiceResp['data'];

      return oThis.platformConfigs;
    }
  }

  async getPlatformStackConfigs() {
    const oThis = this;

    let configs = await oThis.getPlatformConfigs();
    return configs[oThis.constants.platform.stackDataKey];
  }

  async _getAppAllConfigs() {
    const oThis = this;

    if (oThis.appConfigs) {
      return oThis.appConfigs;
    } else {

      // Get app config data

      const commonParams = {
        platformId: oThis.stack,
        env: oThis.env
      };

      let acGetServiceObj = new AppConfigGet(commonParams);
      let acGetServiceResp = await acGetServiceObj.perform({
        subEnv: oThis.subEnv,
        app: oThis.app
      });

      if (acGetServiceResp.err) {
        return Promise.reject(oThis.getError(`Error fetching configurations for app: ${oThis.app}`, 'err_cron_bas_gac_1'));
      }

      oThis.appConfigs = acGetServiceResp['data'];

      return oThis.appConfigs;
    }

  }

  async getOpsConfigs() {
    const oThis = this;
    let appAllConfigs = await oThis._getAppAllConfigs();
    return appAllConfigs[oThis.constants.appConfig.opsConfigDataKey];
  }

  async getAppConfigs() {
    const oThis = this;
    let appAllConfigs = await oThis._getAppAllConfigs();
    return appAllConfigs[oThis.constants.appConfig.appConfigDataKey];
  }


  async registerInfraAlertForLowSeverity(options) {
    return await this.registerInfraAlert(Object.assign({severity: 'low'}, options));
  }

  async registerInfraAlertForMediumSeverity(options) {
    return await this.registerInfraAlert(Object.assign({severity: 'medium'}, options));
  }

  async registerInfraAlertForHighSeverity(options) {
    return await this.registerInfraAlert(Object.assign({severity: 'high'}, options));
  }

  async setExitTimeout(time) {
    setInterval(function () {
      console.info('Ending the process. Sending SIGINT.');
      process.emit('SIGINT');
    }, time);
  }

  async sleep(time) {
    return new Promise(function (resolve) {
      console.info(`Sleeping for ${time} ms ...`);
      setTimeout(resolve, time);
    });
  }
}

module.exports = CronBase;
