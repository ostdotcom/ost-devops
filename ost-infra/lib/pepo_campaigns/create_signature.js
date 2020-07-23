/**
 * Module to create signature for pepo campaigns.
 *
 * @module lib/pepo_campaigns/create_signature
 */

const crypto = require('crypto');

const rootPrefix = '../..',
  envConstants = require(rootPrefix + '/config/env_constants');

/**
 * Class to create signature for Pepo Campaigns.
 *
 * @class CreateSignature
 */
class CreateSignature {
  /**
   * Return current date in RFC 3339 format.
   *
   * @param {Date} date
   *
   * @return {String}
   */
  static rfc3339(date) {
    function pad(number) {
      return number < 10 ? '0' + number : number;
    }

    function timezoneOffset(offset) {
      if (offset === 0) {
        return 'Z';
      }
      const sign = offset > 0 ? '-' : '+';
      offset = Math.abs(offset);

      return sign + pad(Math.floor(offset / 60)) + ':' + pad(offset % 60);
    }

    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      'T' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes()) +
      ':' +
      pad(date.getSeconds()) +
      timezoneOffset(date.getTimezoneOffset())
    );
  }

  /**
   * Get base params.
   *
   * @param {String} endpoint
   * @param {String} clientSecret
   *
   * @return {{requestTime: String, signature: *}}
   */
  static baseParams(endpoint, clientSecret) {
    const requestTime = CreateSignature.rfc3339(new Date()),
      stringToSign = `${endpoint}::${requestTime}`;

    const signature = CreateSignature.generateSignature(stringToSign, clientSecret);

    return {
      requestTime,
      signature
    };
  }

  /**
   * Generate signature.
   *
   * @param {String} stringToSign
   * @param {String} pepoCampaignsSecretKey
   *
   * @return {String}
   */
  static generateSignature(stringToSign, pepoCampaignsSecretKey) {

    return crypto
      .createHmac('sha256', pepoCampaignsSecretKey)
      .update(stringToSign)
      .digest('hex');
  }
}

module.exports = CreateSignature;
