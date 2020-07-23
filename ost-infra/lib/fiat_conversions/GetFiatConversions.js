const AWS = require('aws-sdk');
const rp = require('request-promise');

const FIXER_ENDPOINT_URL = 'http://data.fixer.io/api/latest';

// Declare AWS constants.
const S3_AWS_ACCESS_KEY = '';
const S3_AWS_SECRET_KEY = '';
const S3_ACL = 'public-read';

/**
 * Class to get price points.
 *
 * @class GetFiatConversions
 */
class GetFiatConversions {
  /**
   * Constructor to get price points.
   *
   * @param {object} params
   * @param {string} params.bucketName
   * @param {string} params.filePath
   * @param {string} params.region
   * @param {string} params.fixerApiKey
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.bucketName = params.bucketName;
    oThis.s3FileUrl = params.filePath;
    oThis.region = params.region;
    oThis.fixerApiKey = params.fixerApiKey;

    oThis.fixerApiResponse = {};
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.fetchFixerPricePoints();

    await oThis.uploadToS3();

    return { success: true, data: {} };
  }

  /**
   * Fetch price points from coin market cap.
   *
   * @returns {Promise<void>}
   */
  async fetchFixerPricePoints() {
    const oThis = this;

    const requestOptions = {
      method: 'GET',
      uri: FIXER_ENDPOINT_URL,
      qs: {
        base: 'USD',
        access_key: oThis.fixerApiKey
      },
      json: true,
      gzip: true
    };

    oThis.fixerApiResponse = await rp(requestOptions);

  }

  /**
   * Upload files to S3.
   *
   * @returns {Promise<void>}
   */
  async uploadToS3() {
    const oThis = this;

    console.log(`fixerApiResponse: ${JSON.stringify(oThis.fixerApiResponse)}`);

    if(!oThis.fixerApiResponse.success){
      console.log('--------------found Fixer api failure-----');
      // TODO: Aman. If want to send alert here.
      return;
    }

    const filePath =
      oThis.s3FileUrl ;

    // Create AWSS3 object.
    const AWSS3 = new AWS.S3({
      accessKeyId: S3_AWS_ACCESS_KEY,
      secretAccessKey: S3_AWS_SECRET_KEY,
      region: oThis.region
    });

    await AWSS3.putObject({
      Bucket: oThis.bucketName,
      Key: filePath,
      ACL: S3_ACL,
      Body: JSON.stringify(oThis.fixerApiResponse),
      ContentType: 'application/json'
    }).promise();

  }

}

module.exports = GetFiatConversions;
