/**
 * Module for fetching entries from error_logs table.
 *
 * @module lib/error_logs/process_logs
 */

const rootPrefix = '../..',
  ErrorLogsModel = require(rootPrefix + '/models/error_logs'),
  ErrorLogsConstants = require(rootPrefix + '/config/error_logs'),
  HighSeverityProcessor = require(rootPrefix + '/lib/error_logs/high_severity_processor'),
  MediumAndLowSeverityProcessor = require(rootPrefix + '/lib/error_logs/medium_and_low_severity_processor'),
  responseHelper = new (require(rootPrefix + '/lib/formatter/response_helper'))(),
  Constants = new (require(rootPrefix + '/config/constants'))()
;

/**
 * Class for fetching entries from error_logs table.
 *
 * @class ProcessErrorLogs
 */
class ProcessLogs {
  /**
   * Constructor for fetching entries from error_logs table.
   *
   * @param {Array} severities
   * @param {object} pagerDutyVars
   * @param {object} pepoCampaignVars
   *
   * @constructor
   */
  constructor(severities, pagerDutyVars, pepoCampaignVars) {
    const oThis = this;

    oThis.severities = severities;

    oThis.pagerDutyVars = pagerDutyVars;
    oThis.pepoCampaignVars = pepoCampaignVars;

    oThis.canExit = true;
    oThis.stopPickingUpNewWork = false;
    oThis.moreEntriesExist = false;

    oThis._attachHandlers(); // Attach handlers for SIGINT and SIGTERM.
  }

  /**
   * Performer method for class.
   *
   * @return {*}
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
        internal_error_identifier: 'e_el_pel_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async performer.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis._validateSeverities();

    // Process high severity errors if they need to be processed.
    if (oThis.severities.includes(ErrorLogsConstants.highSeverity)) {
      await oThis._processHighSeverityErrors();
      console.log('High severity errors processed.');
    }

    // Process medium severity errors if they need to be processed.
    if (oThis.severities.includes(ErrorLogsConstants.mediumSeverity)) {
      await oThis._processMediumAndLowSeverityErrors(ErrorLogsConstants.mediumSeverity);
      console.log('Medium severity errors processed.');
    }

    // Process low severity errors if they need to be processed.
    if (oThis.severities.includes(ErrorLogsConstants.lowSeverity)) {
      await oThis._processMediumAndLowSeverityErrors(ErrorLogsConstants.lowSeverity);
      console.log('Low severity errors processed.');
    }

    // Process high severity infra alerts
    if (oThis.severities.includes(ErrorLogsConstants.highSeverity)) {
      await oThis._processInfraErrors(ErrorLogsConstants.highSeverity);
      console.log('High severity infra errors processed.');
    }

    // Process medium severity infra alerts
    if (oThis.severities.includes(ErrorLogsConstants.mediumSeverity)) {
      await oThis._processInfraErrors(ErrorLogsConstants.mediumSeverity);
      console.log('Medium severity infra errors processed.');
    }

    // Process medium severity infra alerts
    if (oThis.severities.includes(ErrorLogsConstants.lowSeverity)) {
      await oThis._processInfraErrors(ErrorLogsConstants.lowSeverity);
      console.log('Low severity infra errors processed.');
    }

    console.log('Actions for all error rows successfully completed.');
  }

  /**
   * Convert a common separated string to array
   *
   * @param {String} string
   *
   * @return {Array}
   */
  commaSeparatedStrToArray(string) {
    return string.split(',').map((ele) => ele.trim());
  }

  /**
   * Validate severities array passed.
   *
   * @private
   */
  _validateSeverities() {
    const oThis = this;

    oThis.severities = oThis.commaSeparatedStrToArray(oThis.severities);

    for (let index = 0; index < oThis.severities.length; index++) {
      const severity = oThis.severities[index];

      if (!ErrorLogsConstants.severities.includes(severity)) {
        console.error(`Invalid severity passed. Severity: ${severity}`);
        throw new Error(`Invalid severity passed. Severity: ${severity}`);
      }
    }
  }

  /**
   * Process high severity errors.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _processHighSeverityErrors() {
    const oThis = this;
    const errorEntries = await new ErrorLogsModel()
      .select('*')
      .where([
        'severity = (?) AND status IN (?) AND app != ?',
        ErrorLogsConstants.highSeverity,
        [ErrorLogsConstants.createdStatus, ErrorLogsConstants.failedStatus],
        Constants.stackApp
      ])
      .limit(ErrorLogsConstants.queryLimits[ErrorLogsConstants.highSeverity])
      .fire();

    oThis.canExit = false;

    oThis.moreEntriesExist = errorEntries.length > ErrorLogsConstants.batchSize;

    if (errorEntries.length > 0) {
      await new HighSeverityProcessor(
        errorEntries.slice(0, ErrorLogsConstants.batchSize),
        oThis.pagerDutyVars,
        oThis.pepoCampaignVars,
        false
      ).perform().catch((error) => {
        console.error('Error: ', error);
        oThis.canExit = true;
      });
    }
    oThis.canExit = true;

    if (oThis.moreEntriesExist) {
      await oThis.sleep(2 * 1000);
      await oThis._processHighSeverityErrors();
    }
  }

  /**
   * Process medium and low severity errors.
   *
   * @param {String} severity: Severity value. Can be only 'medium' or 'low'.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _processMediumAndLowSeverityErrors(severity) {
    const oThis = this;
    const errorEntries = await new ErrorLogsModel()
      .select('*')
      .where([
        'severity = (?) AND status IN (?) AND app != ?',
        severity,
        [ErrorLogsConstants.createdStatus, ErrorLogsConstants.failedStatus],
        Constants.stackApp
      ])
      .limit(ErrorLogsConstants.queryLimits[severity])
      .fire();

    oThis.canExit = false;

    oThis.moreEntriesExist = errorEntries.length > ErrorLogsConstants.batchSize;

    if (errorEntries.length > 0) {
      await new MediumAndLowSeverityProcessor(
        errorEntries.slice(0, ErrorLogsConstants.batchSize),
        severity,
        oThis.pagerDutyVars,
        oThis.pepoCampaignVars,
        false
      ).perform().catch((error) => {
        console.error('Error: ', error);
        oThis.canExit = true;
      });
    }

    oThis.canExit = true;

    if (oThis.moreEntriesExist) {
      await oThis.sleep(2 * 1000);
      await oThis._processMediumAndLowSeverityErrors(severity);
    }
  }


  /**
   * Process infra errors triggered via Nagios
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _processInfraErrors(severity) {
    const oThis = this;
    const errorEntries = await new ErrorLogsModel()
      .select('*')
      .where([
        'severity = (?) AND status IN (?) AND app = ?',
        severity,
        [ErrorLogsConstants.createdStatus, ErrorLogsConstants.failedStatus],
        Constants.stackApp
      ])
      .limit(ErrorLogsConstants.queryLimits[severity])
      .fire();

    oThis.canExit = false;

    oThis.moreEntriesExist = errorEntries.length > ErrorLogsConstants.batchSize;

    if (errorEntries.length > 0) {
      if(severity === ErrorLogsConstants.highSeverity){

        await new HighSeverityProcessor(
          errorEntries.slice(0, ErrorLogsConstants.batchSize),
          oThis.pagerDutyVars,
          oThis.pepoCampaignVars,
          true
        ).perform().catch((error) => {
          console.error('Error: ', error);
          oThis.canExit = true;
        });

      } else {

        await new MediumAndLowSeverityProcessor(
          errorEntries.slice(0, ErrorLogsConstants.batchSize),
          severity,
          oThis.pagerDutyVars,
          oThis.pepoCampaignVars,
          true
        ).perform().catch((error) => {
          console.error('Error: ', error);
          oThis.canExit = true;
        });

      }
    }

    oThis.canExit = true;

    if (oThis.moreEntriesExist) {
      await oThis.sleep(2 * 1000);
      await oThis._processInfraErrors(severity);
    }
  }

  // Functions related to SIGINT/SIGTERM handling start from here.

  /**
   * Attach SIGINT/SIGTERM handlers to the current process.
   *
   * @private
   */
  _attachHandlers() {
    const oThis = this;

    const handle = function() {
      oThis._stopPickingUpNewTasks();

      if (oThis._pendingTasksDone()) {
        console.info(':: No pending tasks. Killing process.');

        // Stop the process only after the entry has been updated in the table.
        process.exit(1);
      } else {
        console.info(':: There are pending tasks. Waiting for completion.');
        setTimeout(handle, 1000);
      }
    };

    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  }

  /**
   * Stops consumption upon invocation.
   *
   * @private
   */
  _stopPickingUpNewTasks() {
    const oThis = this;

    console.info(':: _stopPickingUpNewTasks called');

    oThis.stopPickingUpNewWork = true;
  }

  /**
   * Pending tasks done
   *
   * @return {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Sleep for particular time
   *
   * @param ms {Number}: time in ms
   *
   * @returns {Promise<>}
   */
  async sleep(ms) {
    console.log('Sleeping for ', ms, ' ms');
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

module.exports = ProcessLogs;