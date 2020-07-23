/**
 * Module for sending medium and low priority emails.
 *
 * @module lib/pepo_campaigns/send_aggregated_errors_email
 */

const rootPrefix = '../..',
  PepoCampaignsConstants = require(rootPrefix + '/config/pepo_campaigns'),
  sendEmailBaseObj = require(rootPrefix + '/lib/pepo_campaigns/send_email_base');

/**
 * Class for sending aggregated emails.
 *
 * @class SendAggregatedErrorEmails
 */
class SendAggregatedErrorEmails {

  /**
   * Constructor to send aggregated emails
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.emailBaseObj = new sendEmailBaseObj(params);
  }

  /**
   * Returns subject of the email.
   *
   * @param {Object} aggregatedEntry
   *
   * @return {String}
   */
  static subject(aggregatedEntry) {
    return `${aggregatedEntry.env_id} :: ${aggregatedEntry.app} :: Severity: ${aggregatedEntry.severity} :: Kind: ${
      aggregatedEntry.kind
    }`;
  }

  /**
   * Returns email template variables.
   *
   * @param {Object} aggregatedEntry
   *
   * @return {String}
   */
  static emailTemplateVars(aggregatedEntry) {
    return JSON.stringify({
      env_id: aggregatedEntry.env_id,
      kind: aggregatedEntry.kind,
      app: aggregatedEntry.remoteApp,
      count: aggregatedEntry.count,
      severity: aggregatedEntry.severity,
      machine_ips: aggregatedEntry.machine_ips.join(),
      ids: aggregatedEntry.ids.join(),
      error_data: aggregatedEntry.data,
      subject: SendAggregatedErrorEmails.subject(aggregatedEntry)
    });
  }

  /**
   * Send email.
   *
   * @param {Object} aggregatedEntry
   */
  async sendEmail(aggregatedEntry) {
    const oThis = this;

    const notifierEmailIds = PepoCampaignsConstants.notifierEmailIds[aggregatedEntry.app] || [],
      promisesArray = [];

    if (notifierEmailIds.length < 1) {
      notifierEmailIds.push(PepoCampaignsConstants.defaultNotifierEmailId);
    }

    for (let index = 0; index < notifierEmailIds.length; index++) {
      const notifierEmailId = notifierEmailIds[index],
        emailParams = {
          email: notifierEmailId,
          template: PepoCampaignsConstants.aggregatedErrorLogsTemplateName,
          email_vars: SendAggregatedErrorEmails.emailTemplateVars(aggregatedEntry)
        };

      promisesArray.push(oThis.emailBaseObj.post(PepoCampaignsConstants.sendTransactionalEmailEndpoint, emailParams));
    }

    return Promise.all(promisesArray);
  }
}

module.exports = SendAggregatedErrorEmails;
