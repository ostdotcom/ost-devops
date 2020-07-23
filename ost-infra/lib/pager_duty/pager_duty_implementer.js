/**
 * Module for pager duty.
 *
 * @module pager_duty
 */

const shell = require('shelljs'),
  PagerDuty = require('pagerduty-client');

shell.config.silent = true;

const FgRed = '\x1b[31m',
  FgGreen = '\x1b[32m',
  defColor = '\x1b[0m';

/**
 * Class for pager duty implementer.
 *
 * @class PagerDutyImplementer
 */
class PagerDutyImplementer {

  /**
   * Constructor to PagerDuty incidents
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params, infraAlert) {
    const oThis = this;

    oThis.highSeverityApiKey = params.highSeverityApiKey;
    oThis.mediumSeverityApiKey = params.mediumSeverityApiKey;
    oThis.highSeverityInfraApiKey = params.highSeverityInfraApiKey;
    oThis.mediumSeverityInfraApiKey = params.mediumSeverityInfraApiKey;
    oThis.infraAlert = infraAlert;
  }

  /**
   * Call pagerDuty create for high severity errors.
   *
   * @param {String} incidentKey
   * @param {String} description
   *
   * @return {Promise<*>}
   */
  async createHighSeverityPagerDutyIncident(incidentKey, description) {
    const oThis = this;
    let key = (oThis.infraAlert ? oThis.highSeverityInfraApiKey : oThis.highSeverityApiKey);
    const pager = new PagerDuty(key);

    return new Promise(function (resolve, reject) {
      pager
        .trigger(incidentKey, description, null)
        .then((data) => {
          console.log(FgGreen, 'Incident creation triggered!', defColor);
          resolve(data);
        })
        .catch((err) => {
          console.log(FgRed, 'Error:', err, defColor);
          reject(err);
        });
    });

    // return pager
    //   .trigger(incidentKey, description, null)
    //   .then(() => {
    //     console.log(FgGreen, 'Incident creation triggered!', defColor);
    //   })
    //   .catch((err) => {
    //     console.log(FgRed, 'Error:', err, defColor);
    //   });
  }

  /**
   * Call pagerDuty create for medium severity errors.
   *
   * @param {String} incidentKey
   * @param {String} description
   *
   * @return {Promise<*>}
   */
  async createMediumSeverityPagerDutyIncident(incidentKey, description) {
    const oThis = this;
    let key = (oThis.infraAlert ? oThis.mediumSeverityInfraApiKey : oThis.mediumSeverityApiKey);
    const pager = new PagerDuty(key);

    return pager
      .trigger(incidentKey, description, null)
      .then(() => {
        console.log(FgGreen, 'Incident creation triggered!', defColor);
      })
      .catch((err) => {
        console.log(FgRed, 'Error:', err, defColor);
      });
  }

  /**
   * Call pagerDuty acknowledge for high severity.
   *
   * @param {String} incidentKey
   * @param {String} description
   *
   * @return {Promise<*>}
   */
  async acknowledgeHighSeverityPagerDutyIncident(incidentKey, description) {
    const oThis = this;
    const pager = new PagerDuty(oThis.highSeverityApiKey);

    return pager
      .acknowledge(incidentKey, description, null)
      .then((data) => {
        console.log(FgGreen, 'Incident creation acknowledged!', defColor);
      })
      .catch((err) => {
        console.log(FgRed, 'Error:', err, defColor);
      });
  }

  /**
   * Call pagerDuty acknowledge for medium severity.
   *
   * @param {String} incidentKey
   * @param {String} description
   *
   * @return {Promise<*>}
   */
  async acknowledgeMediumSeverityPagerDutyIncident(incidentKey, description) {
    const oThis = this;
    const pager = new PagerDuty(oThis.mediumSeverityApiKey);

    return pager
      .acknowledge(incidentKey, description, null)
      .then((data) => {
        console.log(FgGreen, 'Incident creation acknowledged!', defColor);
      })
      .catch((err) => {
        console.log(FgRed, 'Error:', err, defColor);
      });
  }

  /**
   * Call pagerDuty resolve for high severity errors.
   *
   * @param {String} incidentKey
   * @param {String} description
   *
   * @return {Promise<*>}
   */
  async resolveHighSeverityPagerDutyIncident(incidentKey, description) {
    const oThis = this;
    const pager = new PagerDuty(oThis.highSeverityApiKey);

    return pager
      .resolve(incidentKey, description, null)
      .then(() => {
        console.log(FgGreen, 'Incident resolve triggered!', defColor);
      })
      .catch((err) => {
        console.log(FgRed, 'Error:', err, defColor);
      });
  }

  /**
   * Call pagerDuty resolve for medium severity errors.
   *
   * @param {String} incidentKey
   * @param {String} description
   *
   * @return {Promise<*>}
   */
  async resolveMediumSeverityPagerDutyIncident(incidentKey, description) {
    const oThis = this;
    const pager = new PagerDuty(oThis.mediumSeverityApiKey);

    return pager
      .resolve(incidentKey, description, null)
      .then(() => {
        console.log(FgGreen, 'Incident resolve triggered!', defColor);
      })
      .catch((err) => {
        console.log(FgRed, 'Error:', err, defColor);
      });
  }
}

module.exports = PagerDutyImplementer;
