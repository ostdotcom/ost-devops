/**
 * Class to process high severity errors.
 *
 * @module lib/error_logs/high_severity_processor
 */

const rootPrefix = '../..',
  ErrorLogsModel = require(rootPrefix + '/models/error_logs'),
  ErrorLogsConstants = require(rootPrefix + '/config/error_logs'),
  PagerDutyImplementer = require(rootPrefix + '/lib/pager_duty/pager_duty_implementer'),
  SendHighSeverityErrorsEmail = require(rootPrefix + '/lib/pepo_campaigns/send_high_severity_errors_email');

/**
 * Class to process high severity errors.
 *
 * @class HighSeverityProcessor
 */
class HighSeverityProcessor {
  /**
   * Constructor to process high severity errors.
   *
   * @param {Array} errorEntries
   *
   * @constructor
   */
  constructor(errorEntries, pagerDutyVars, pepoCampaignVars, infraAlert) {
    const oThis = this;

    oThis.errorEntries = errorEntries;
    oThis.currentTime = new Date();

    oThis.pagerDutyVars = pagerDutyVars;
    oThis.pepoCampaignVars = pepoCampaignVars;
    oThis.infraAlert = infraAlert;
  }

  /**
   * Main performer for class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this,
      emailPromisesArray = [],
      resolvedErrorEntryIds = [],
      pagerDutyPromisesArray = [];

    for (let index = 0; index < oThis.errorEntries.length; index++) {
      const errorEntry = oThis.errorEntries[index];

      let data = JSON.parse(errorEntry.data);
      let remoteApp = data.remoteApp ? data.remoteApp : errorEntry.app;
      errorEntry['remoteApp'] = remoteApp;

      if(oThis.pagerDutyVars.highSeverityApiKey !== '' || (oThis.infraAlert && oThis.pagerDutyVars.highSeverityInfraApiKey !== '')){
        pagerDutyPromisesArray.push(oThis._createPagerDutyTicket(errorEntry));
      }

      emailPromisesArray.push(
        oThis._sendEmail(errorEntry).catch(async function(error) {
          if (errorEntry.retry_count < ErrorLogsConstants.maxRetryCount) {
            // Mark this entry as failed.
            console.log(`Error occurred while sending email. Error: ${JSON.stringify(error)}`);
            await new ErrorLogsModel().markEntriesAsFailed([errorEntry.id]);
          } else {
            // Mark this entry as completely failed.
            console.log(
              `Error occurred while sending email. Marking this entry as completely failed. Error: ${JSON.stringify(
                error
              )}`
            );
            await new ErrorLogsModel().markEntriesAsCompletelyFailed([errorEntry.id]);
          }
        })
      );
    }

    if(pagerDutyPromisesArray.length > 0){
      let pagerDutyResp = await Promise.all(pagerDutyPromisesArray);
      for (let i = 0; i < pagerDutyResp.length; i++) {
        let resp = pagerDutyResp[i];
        console.log("PagerDuty => ", resp);
      }
    }

    const resolvedPromises = await Promise.all(emailPromisesArray);

    for (let index = 0; index < resolvedPromises.length; index++) {
      // If promise resolves, we need to mark that entry as processed.
      if (resolvedPromises[index]) {
        resolvedErrorEntryIds.push(oThis.errorEntries[index].id);
      }
      // If promise is not resolved, promiseArray has an undefined on that array index.
    }
    if (resolvedErrorEntryIds.length > 0) {
      return new ErrorLogsModel().markEntriesAsProcessed(resolvedErrorEntryIds);
    }
  }

  /**
   * Send email for high priority error entity.
   *
   * @param {Object} errorEntry
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _sendEmail(errorEntry) {
    const oThis = this;
    return new SendHighSeverityErrorsEmail(oThis.pepoCampaignVars).sendEmail(errorEntry);
  }

  /**
   * Create pager duty incident.
   *
   * @param {Object} errorEntry
   * @param {String} errorEntry.app
   * @param {String} errorEntry.env_id
   * @param {String} errorEntry.machine_ip
   * @param {String} errorEntry.kind
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _createPagerDutyTicket(errorEntry) {
    const oThis = this;

    const incidentKey = `INCIDENT FOR ${errorEntry.remoteApp} ${errorEntry.env_id} has occurred on ${
        errorEntry.machine_ip
      }. at ${oThis.currentTime} Error is: ${errorEntry.kind}`,
      description = `INCIDENT FOR ${errorEntry.remoteApp} ${errorEntry.env_id} has occurred on ${
        errorEntry.machine_ip
      }. Error is: ${errorEntry.kind}`;

    return new PagerDutyImplementer(oThis.pagerDutyVars, oThis.infraAlert).createHighSeverityPagerDutyIncident(incidentKey, description);
  }
}

module.exports = HighSeverityProcessor;
