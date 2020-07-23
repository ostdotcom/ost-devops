'use strict';

/**
 * Model for error logs table.
 *
 * @module models/error_logs
 */

const rootPrefix = '..',
  ModelBaseKlass = require(rootPrefix + '/models/base'),
  ErrorLogsConstants = require(rootPrefix + '/config/error_logs')
;


/**
 * Class for error logs model.
 *
 * @class ErrorLogs
 */
class ErrorLogs extends ModelBaseKlass {
  /**
   * Constructor for error logs model.
   *
   * @augments ModelBaseKlass
   *
   * @constructor
   */
  constructor() {
    let env=process.env['APP_ENV'];
    let dbName = `infra_logs_${env}`;
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'error_logs';
  }

  /**
   * Mark error entry as failed.
   *
   * @param {Array} errorEntryIds
   *
   * @return {Promise<void>}
   */
  async markEntriesAsFailed(errorEntryIds) {
    const oThis = this;

    // Mark this entry as failed.
    await oThis
      .update(['status = (?), retry_count = retry_count + 1', ErrorLogsConstants.failedStatus])
      .where(['id IN (?)', errorEntryIds])
      .fire();
  }

  /**
   * Mark error entry as completely failed.
   *
   * @param {Object} errorEntryIds
   *
   * @return {Promise<void>}
   */
  async markEntriesAsCompletelyFailed(errorEntryIds) {
    const oThis = this;

    // Mark this entry as completely failed.
    await oThis
      .update(['status = (?)', ErrorLogsConstants.completelyFailedStatus])
      .where(['id IN (?)', errorEntryIds])
      .fire();
  }

  /**
   * Mark error entries as processed.
   *
   * @param {Array} errorEntryIds
   *
   * @return {Promise<void>}
   */
  async markEntriesAsProcessed(errorEntryIds) {
    const oThis = this;

    // Mark these entries as processed.
    await oThis
      .update(['status = (?)', ErrorLogsConstants.processedStatus])
      .where(['id IN (?)', errorEntryIds])
      .fire();
  }
}

module.exports = ErrorLogs;
