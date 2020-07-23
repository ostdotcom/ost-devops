
const rootPrefix = '../..',
  ErrorLogs = require(rootPrefix + '/models/error_logs'),
  responseHelper = new (require(rootPrefix + '/lib/formatter/response_helper'))(),
  errorLogsConstants = require(rootPrefix + '/config/error_logs')
;

/**
 * Class to create entry in error_logs table.
 *
 * @class CreateEntry
 */
class CreateEntry {

  /**
   * Constructor to create error entries
   *
   * @param {object} data - Input data object
   *
   * @constructor
   */
  constructor(data) {
    const oThis = this;

    oThis.data = data;
  }

  /**
   * Performer method for class.
   *
   * @return {Promise<void>}
   */
  perform(options) {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      console.error(`${__filename}::perform::catch`);
      console.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_el_ce_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: { error: error.toString(), stack: error.stack }
      });
    });
  }

  /**
   * Async performer.
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    oThis._validateInputParams();

    return responseHelper.successWithData(await oThis._insertEntry());
  }

  /**
   * Validate input parameters.
   *
   * @returns {*}
   * @private
   */
  _validateInputParams() {
    const oThis = this;

    let data = oThis.data;

    if(!data){
      console.error('Mandatory parameters missing. Please send correct data object.');
      return Promise.reject(new Error('Mandatory parameters missing. Please send correct data object.'));
    }

    if(!data['kind']){
      console.error('Mandatory parameters missing. Please send correct property "kind".');
      return Promise.reject(new Error('Mandatory parameters missing. Please send correct property "kind".'));
    }
    oThis.kind = data['kind'];

    let severity = data['severity'];
    if(!severity){
      console.error('Severity not sent. Setting as high.');
      severity = errorLogsConstants.highSeverity;
    }

    if (!errorLogsConstants.severities.includes(severity)) {
      console.error('Invalid parameters. Please send correct property "severity".');
      return Promise.reject(new Error('Invalid parameters. Please send correct property "severity".'));
    }
    oThis.severity = severity;

    if(!data['appName']){
      console.error('Mandatory parameters missing. Please send correct property "appName".');
      return Promise.reject(new Error('Mandatory parameters missing. Please send correct property "appName".'));
    }
    oThis.appName = data['appName'];

    if(!data['envIdentifier']){
      console.error('Mandatory parameters missing. Please send correct property "envIdentifier".');
      return Promise.reject(new Error('Mandatory parameters missing. Please send correct property "envIdentifier".'));
    }
    oThis.envIdentifier = data['envIdentifier'];

    if(!data['ipAddress']){
      console.error('Mandatory parameters missing. Please send correct property "ipAddress".');
      return Promise.reject(new Error('Mandatory parameters missing. Please send correct property "ipAddress".'));
    }
    oThis.ipAddress = data['ipAddress'];
  }

  /**
   * Insert entry in error_logs table.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _insertEntry() {
    const oThis = this;

    const currentTime = new Date();

    let resp = await new ErrorLogs()
      .insert({
        app: oThis.appName,
        env_id: oThis.envIdentifier,
        severity: oThis.severity,
        machine_ip: oThis.ipAddress,
        kind: oThis.kind,
        data: JSON.stringify(oThis.data),
        status: errorLogsConstants.createdStatus,
        created_at: currentTime,
        updated_at: currentTime
      })
      .fire();

    let insertId = resp['insertId'];
    console.log(`Entry created successfully in error_logs table with ID ${insertId}.`);

    return {id: insertId};
  }
}

module.exports = CreateEntry;