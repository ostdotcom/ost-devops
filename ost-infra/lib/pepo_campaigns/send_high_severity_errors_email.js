/**
 * Module for sending high severity error emails.
 *
 * @module lib/pepo_campaigns/send_high_severity_errors_email
 */

const rootPrefix = '../..',
  PepoCampaignsConstants = require(rootPrefix + '/config/pepo_campaigns'),
  sendEmailBaseObj = require(rootPrefix + '/lib/pepo_campaigns/send_email_base');

/**
 * Class for sending high severity error emails.
 *
 * @class SendHighSeverityErrorEmails
 */
class SendHighSeverityErrorEmails {

  /**
   * Constructor to send high severity emails
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
   * @param {Object} errorRow
   *
   * @return {String}
   */
  static subject(errorRow) {
    return `${errorRow.env_id} :: ${errorRow.app} :: Severity: ${errorRow.severity} :: Kind: ${errorRow.kind}`;
  }

  /**
   * Returns email template variables.
   *
   * @param {Object} errorRow
   *
   * @return {String}
   */
  static emailTemplateVars(errorRow) {
    return JSON.stringify({
      app: errorRow.remoteApp,
      env_id: errorRow.env_id,
      severity: errorRow.severity,
      machine_ip: errorRow.machine_ip,
      kind: errorRow.kind,
      error_data: errorRow.data,
      subject: SendHighSeverityErrorEmails.subject(errorRow),
      created_at: errorRow.created_at
    });
  }

  /**
   * Send email.
   *
   * @param {Object} errorRow
   *
   * @return {Promise<*>}
   */
  async sendEmail(errorRow) {
    const oThis = this;

    const notifierEmailIds = PepoCampaignsConstants.notifierEmailIds[errorRow.app] || [],
      promisesArray = [];

    if (notifierEmailIds.length < 1) {
      notifierEmailIds.push(PepoCampaignsConstants.defaultNotifierEmailId);
    }

    for (let index = 0; index < notifierEmailIds.length; index++) {
      const notifierEmailId = notifierEmailIds[index],
        emailParams = {
          email: notifierEmailId,
          template: PepoCampaignsConstants.highPriorityErrorLogsTemplateName,
          email_vars: SendHighSeverityErrorEmails.emailTemplateVars(errorRow)
        };

      promisesArray.push(oThis.emailBaseObj.post(PepoCampaignsConstants.sendTransactionalEmailEndpoint, emailParams));
    }

    return Promise.all(promisesArray);
  }
}

module.exports = SendHighSeverityErrorEmails;
