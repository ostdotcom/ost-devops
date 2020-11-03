/**
 * Class to process medium and low severity errors.
 *
 * @module lib/error_logs/aggregated_emails_processor
 */

const rootPrefix = '../..',
  ErrorLogsModel = require(rootPrefix + '/models/error_logs'),
  ErrorLogsConstants = require(rootPrefix + '/config/error_logs'),
  PagerDutyImplementer = require(rootPrefix + '/lib/pager_duty/pager_duty_implementer'),
  SendAggregatedErrorsEmail = require(rootPrefix + '/lib/pepo_campaigns/send_aggregated_errors_email');

/**
 * Class to process medium and low severity errors.
 *
 * @class MediumAndLowSeverityProcessor
 */
class MediumAndLowSeverityProcessor {
  /**
   * Constructor to process medium and low severity errors.
   *
   * @param {Array} errorEntries
   * @param {String} [severity]
   *
   * @constructor
   */
  constructor(errorEntries, severity, pagerDutyVars, pepoCampaignVars, infraAlert) {
    const oThis = this;

    oThis.errorEntries = errorEntries;
    oThis.severity = severity;

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
      aggregatedEntries = [],
      resolvedErrorEntryIds = [],
      allAggregatedEntities = {},
      pagerDutyPromisesArray = [];

    // Aggregate entries.
    for (let index = 0; index < oThis.errorEntries.length; index++) {
      const errorEntry = oThis.errorEntries[index],
        appType = errorEntry.app,
        envId = errorEntry.env_id,
        kind = errorEntry.kind,
        data = JSON.parse(errorEntry.data),
        remoteApp = (data.remoteApp ? data.remoteApp : appType)
      ;

      let aggregated_error_key = `${remoteApp}-${envId}-${kind}`;

      allAggregatedEntities[aggregated_error_key] = allAggregatedEntities[aggregated_error_key] || {
        env_id: envId,
        app: appType,
        remoteApp: remoteApp,
        kind: kind,
        count: 0,
        ids: [],
        machine_ips: [],
        retry_count: errorEntry.retry_count,
        severity: errorEntry.severity,
        data: errorEntry.data,
        created_at: errorEntry.created_at // During the last iteration of the loop, this will have the created_at time of the latest error row entry.
      };

      allAggregatedEntities[aggregated_error_key].count++;
      allAggregatedEntities[aggregated_error_key].ids.push(errorEntry.id);
      allAggregatedEntities[aggregated_error_key].machine_ips.push(errorEntry.machine_ip);
      allAggregatedEntities[aggregated_error_key].machine_ips = [
        ...new Set(allAggregatedEntities[aggregated_error_key].machine_ips)
      ]; // Get unique machine Ips.
    }

    // Loop over aggregated entries and send emails.
    for (const aggregatedKey in allAggregatedEntities) {
      const aggregatedEntry = allAggregatedEntities[aggregatedKey];

      aggregatedEntries.push(aggregatedEntry);

      // Call pager duty only for medium severity errors.
      if (oThis.severity === ErrorLogsConstants.mediumSeverity) {

        if(oThis.pagerDutyVars.mediumSeverityApiKey !== '' || (oThis.infraAlert && oThis.pagerDutyVars.mediumSeverityInfraApiKey !== '')){
          pagerDutyPromisesArray.push(oThis._createPagerDutyTicket(aggregatedEntry));
        }
      }

      emailPromisesArray.push(
        oThis._sendEmail(aggregatedEntry).catch(async function(error) {
          if (aggregatedEntry.retry_count < ErrorLogsConstants.maxRetryCount) {
            // Mark these entries as failed.
            console.log(`Error occurred while sending email. Error: ${JSON.stringify(error)}`);
            await new ErrorLogsModel().markEntriesAsFailed(aggregatedEntry.ids);
          } else {
            // Mark these entries as completely failed.
            console.log(
              `Error occurred while sending email. Marking this entry as completely failed. Error: ${JSON.stringify(
                error
              )}`
            );
            await new ErrorLogsModel().markEntriesAsCompletelyFailed(aggregatedEntry.ids);
          }
        })
      );
    }

    if (oThis.severity === ErrorLogsConstants.mediumSeverity && pagerDutyPromisesArray.length > 0) {
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
        const ids = aggregatedEntries[index].ids;
        // Loop over ids array and push them to resolvedErrorEntryIds
        // Which will be later used to mark all these ids as processed.
        for (let idsIndex = 0; idsIndex < ids.length; idsIndex++) {
          resolvedErrorEntryIds.push(ids[idsIndex]);
        }
      }
      // If promise is not resolved, promiseArray has an undefined on that array index.
    }

    if (resolvedErrorEntryIds.length > 0) {
      return new ErrorLogsModel().markEntriesAsProcessed(resolvedErrorEntryIds);
    }
  }

  /**
   * Send email for medium and low priority errors.
   *
   * @param {Object} aggregatedEntry
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _sendEmail(aggregatedEntry) {
    const oThis = this;
    return new SendAggregatedErrorsEmail(oThis.pepoCampaignVars).sendEmail(aggregatedEntry);
  }

  /**
   * Create pager duty incident.
   *
   * @param {Object} aggregatedEntry
   * @param {String} aggregatedEntry.app
   * @param {String} aggregatedEntry.env_id
   * @param {String} aggregatedEntry.count
   * @param {String} aggregatedEntry.kind
   * @param {String} aggregatedEntry.machine_ips
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _createPagerDutyTicket(aggregatedEntry) {
    const oThis = this;

    const incidentKey = `INCIDENT FOR ${aggregatedEntry.remoteApp} ${aggregatedEntry.env_id} ${
        aggregatedEntry.kind
      } has occurred ${aggregatedEntry.count} times at ${new Date()}.`,
      description = `INCIDENT FOR ${aggregatedEntry.remoteApp} ${aggregatedEntry.env_id} ${
        aggregatedEntry.kind
      } has occurred ${aggregatedEntry.count} times on ${aggregatedEntry.machine_ips}.`;

    return new PagerDutyImplementer(oThis.pagerDutyVars, oThis.infraAlert).createMediumSeverityPagerDutyIncident(incidentKey, description);
  }
}

module.exports = MediumAndLowSeverityProcessor;
