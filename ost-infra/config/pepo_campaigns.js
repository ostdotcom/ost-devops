/**
 * Module for constants related to pepo campaigns.
 *
 * @module config/pepo_campaigns
 */

const rootPrefix = '..',
  Constants = new (require(rootPrefix + '/config/constants'))()
;


/**
 * Class for pepo campaigns constants.
 *
 * @class PepoCampaignsConstants
 */
class PepoCampaignsConstants {
  static get baseUrl() {
    return 'https://pepocampaigns.com';
  }

  static get notifierEmailIds() {
    return {
      [Constants.saasApiApp]: ['backend@ost.com'],
      [Constants.stackApp]: ['devops@ost.com']
    };
  }

  static get defaultNotifierEmailId() {
    return 'backend@ost.com';
  }

  static get sendTransactionalEmailEndpoint() {
    return '/api/v1/send/';
  }

  static get highPriorityErrorLogsTemplateName() {
    return 'platform_high_priority_error_logs';
  }

  static get aggregatedErrorLogsTemplateName() {
    return 'platform_aggregated_error_logs';
  }

  static get timeout() {
    return 5000;
  }
}

module.exports = PepoCampaignsConstants;
