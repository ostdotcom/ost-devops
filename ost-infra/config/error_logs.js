/**
 * Module for error log constants.
 *
 * @module lib/errorLogs/errorLogsConstants
 */

/**
 * Class for error log constants.
 *
 * @class
 */
class ErrorLogsConstants {
  /**
   * Get high severity string.
   *
   * @return {String}
   */
  static get highSeverity() {
    return 'high';
  }

  /**
   * Get medium severity string.
   *
   * @return {String}
   */
  static get mediumSeverity() {
    return 'medium';
  }

  /**
   * Get low severity string.
   *
   * @return {String}
   */
  static get lowSeverity() {
    return 'low';
  }

  /**
   * Get created status string.
   *
   * @return {String}
   */
  static get createdStatus() {
    return 'created';
  }

  /**
   * Get processed status string.
   *
   * @return {String}
   */
  static get processedStatus() {
    return 'processed';
  }

  /**
   * Get failed status string.
   *
   * @return {String}
   */
  static get failedStatus() {
    return 'failed';
  }

  /**
   * Get completely failed status string.
   *
   * @return {String}
   */
  static get completelyFailedStatus() {
    return 'completelyFailed';
  }

  /**
   * Get max retry count.
   *
   * @return {Number}
   */
  static get maxRetryCount() {
    return 20;
  }

  /**
   * Get saas app type.
   *
   * @return {String}
   */
  static get saasAppType() {
    return 'saas';
  }
  /**
   * Get wallet-sdk-internal app type.
   *
   * @return {String}
   */
  static get walletSdkInternalAppType() {
    return 'wallet-sdk-internal';
  }
  /**
   * Get wallet-sdk-platform-api  app type.
   *
   * @return {String}
   */
  static get walletSdkPlatformApiAppType() {
    return 'wallet-sdk-platform-api ';
  }
  /**
   * Get query limits for severities.
   *
   * @return {*}
   */
  static get queryLimits() {
    return {
      [ErrorLogsConstants.highSeverity]: ErrorLogsConstants.batchSize + 1,
      [ErrorLogsConstants.mediumSeverity]: ErrorLogsConstants.batchSize + 1,
      [ErrorLogsConstants.lowSeverity]: ErrorLogsConstants.batchSize + 1
    };
  }

  /**
   * Get batch size.
   *
   * @return {number}
   */
  static get batchSize() {
    return 100;
  }

  /**
   * Get all severities.
   *
   * @return {*[]}
   */
  static get severities() {
    return [ErrorLogsConstants.highSeverity, ErrorLogsConstants.mediumSeverity, ErrorLogsConstants.lowSeverity];
  }
}

module.exports = ErrorLogsConstants;
