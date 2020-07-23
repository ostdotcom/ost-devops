const AWS = require('aws-sdk');
const rp = require('request-promise');

// Declare coinmarketcap constants.
const OST_SYMBOL = 'OST';
const USDC_SYMBOL = 'USDC';
const COINMARKETCAP_OST_PREFIX = 'simple-token';
const COINMARKETCAP_USDC_PREFIX = 'usd-coin';
const PRICE_CONVERSION_AMOUNT = '1';
const QUOTE_CURRENCIES_ARRAY = ['USD', 'EUR', 'GBP'];
const COINMARKETCAP_OST_MARKETS_URL = 'https://coinmarketcap.com/currencies/ost/markets';
const COINMARKETCAP_PRICE_CONVERSION_API_ENDPOINT = 'https://pro-api.coinmarketcap.com/v1/tools/price-conversion';
const COINMARKETCAP_WEB_API_ENDPOINT =
  'https://web-api.coinmarketcap.com/v1/cryptocurrency/market-pairs/latest?aux=num_market_pairs,category,fee_type,market_url,notice,price_quote,effective_liquidity&id=2296&limit=400&sort=cmc_rank&convert=';
const PERCENTAGE_THRESHOLD = 25;

// Declare AWS constants.
const S3_AWS_ACCESS_KEY = '';
const S3_AWS_SECRET_KEY = '';
const S3_ACL = 'public-read';

/**
 * Class to get price points.
 *
 * @class GetPricePoints
 */
class GetPricePoints {
  /**
   * Constructor to get price points.
   *
   * @param {object} params
   * @param {string} params.bucketName
   * @param {string} params.filePathPrefix
   * @param {string} params.region
   * @param {string} params.coinMarketCapApiKey
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.bucketName = params.bucketName;
    oThis.s3FileUrl = params.filePathPrefix;
    oThis.region = params.region;
    oThis.coinMarketCapApiKey = params.coinMarketCapApiKey;

    oThis.stakeCurrencyToQuoteCurrencyPriceMap = { [COINMARKETCAP_USDC_PREFIX]: {}, [COINMARKETCAP_OST_PREFIX]: {} };
    oThis.errorsArray = [];
    oThis.warningsArray = [];
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.fetchCoinMarketCapPricePoints();

    await oThis.uploadToS3();

    if (oThis.errorsArray.length > 0) {
      return { success: false, data: { errors: oThis.errorsArray, warnings: oThis.warningsArray } };
    }

    return { success: true, data: { warnings: oThis.warningsArray } };
  }

  /**
   * Fetch price points from coin market cap.
   *
   * @returns {Promise<void>}
   */
  async fetchCoinMarketCapPricePoints() {
    const oThis = this;

    await Promise.all([oThis.fetchUsdcPricePoints(), oThis.fetchOstPricePoints()]);
  }

  /**
   * Fetch USDC price points from Coin Market Cap.
   *
   * @sets oThis.stakeCurrencyToQuoteCurrencyPriceMap
   *
   * @returns {Promise<void>}
   */
  async fetchUsdcPricePoints() {
    const oThis = this;

    const requestOptions = {
      method: 'GET',
      uri: COINMARKETCAP_PRICE_CONVERSION_API_ENDPOINT,
      qs: {
        symbol: USDC_SYMBOL,
        amount: PRICE_CONVERSION_AMOUNT
      },
      headers: {
        'X-CMC_PRO_API_KEY': oThis.coinMarketCapApiKey
      },
      json: true,
      gzip: true
    };

    const promisesArray = [];

    for (let index = 0; index < QUOTE_CURRENCIES_ARRAY.length; index++) {
      requestOptions.qs.convert = QUOTE_CURRENCIES_ARRAY[index];
      promisesArray.push(rp(requestOptions));
    }

    const promisesResponse = await Promise.all(promisesArray);

    for (let index = 0; index < QUOTE_CURRENCIES_ARRAY.length; index++) {
      const quoteCurrency = QUOTE_CURRENCIES_ARRAY[index];
      const requestResponse = promisesResponse[index];
      if (requestResponse.status.error_code === 0) {
        oThis.stakeCurrencyToQuoteCurrencyPriceMap[COINMARKETCAP_USDC_PREFIX][quoteCurrency] =
          requestResponse.data.quote[quoteCurrency].price;
      } else {
        console.error(`Error in making API call. Error response: ${requestResponse}`);

        const errorObject = {
          internal_error_identifier: 'l_pp_gpp_1',
          api_error_identifier: 'cmc_usdc_api_error',
          debug_options: { err: requestResponse, quoteCurrency: quoteCurrency }
        };

        oThis.errorsArray.push(errorObject);
      }
    }
  }

  /**
   * Fetch OST price points from Coin Market Cap.
   *
   * @sets oThis.stakeCurrencyToQuoteCurrencyPriceMap
   *
   * @returns {Promise<void>}
   */
  async fetchOstPricePoints() {
    const oThis = this;

    await oThis.fetchUsingWebApiEndpoint();

    await oThis.fetchUsingAuthenticatedEndpoint();
  }

  /**
   * Fetch price points for OST using the WEB API endpoint.
   *
   * @sets oThis.stakeCurrencyToQuoteCurrencyPriceMap, oThis.errorsArray
   *
   * @returns {Promise<void>}
   */
  async fetchUsingWebApiEndpoint() {
    const oThis = this;

    await oThis.callCoinMarketCapOstMarketsUrl();
    // Sleep for 2 seconds.
    await oThis.sleep(2000);

    const requestOptions = {
      method: 'GET',
      headers: {
        scheme: 'https',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'cache-control': 'max-age=0',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': 1,
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36'
      },
      json: true,
      gzip: true
    };

    for (let index = 0; index < QUOTE_CURRENCIES_ARRAY.length; index++) {
      const quoteCurrency = QUOTE_CURRENCIES_ARRAY[index];
      requestOptions.uri = COINMARKETCAP_WEB_API_ENDPOINT + quoteCurrency;

      const requestResponse = await rp(requestOptions);
      if (requestResponse.status.error_code === 0) {
        const marketPairs = requestResponse.data.market_pairs;
        for (let ind = 0; ind < marketPairs.length; ind++) {
          const marketPair = marketPairs[ind];
          if (marketPair.exchange.name === 'Binance' && marketPair.market_pair_quote.exchange_symbol === 'BTC') {
            oThis.stakeCurrencyToQuoteCurrencyPriceMap[COINMARKETCAP_OST_PREFIX][quoteCurrency] =
              marketPair.quote[quoteCurrency].price;
          }
        }
      } else {
        console.error(`Error in making API call. Error response: ${requestResponse}`);
        const errorObject = {
          internal_error_identifier: 'l_pp_gpp_2',
          api_error_identifier: 'cmc_ost_markets_url_error',
          debug_options: { err: requestResponse, quoteCurrency: quoteCurrency }
        };

        oThis.errorsArray.push(errorObject);
      }

      // Sleep for some time.
      await oThis.sleep(10000);
    }
  }

  /**
   * Fetch ost price points using authenticated endpoint.
   *
   * @sets oThis.stakeCurrencyToQuoteCurrencyPriceMap, oThis.errorsArray
   *
   * @returns {Promise<void>}
   */
  async fetchUsingAuthenticatedEndpoint() {
    const oThis = this;

    const requestOptions = {
      method: 'GET',
      uri: COINMARKETCAP_PRICE_CONVERSION_API_ENDPOINT,
      qs: {
        symbol: OST_SYMBOL,
        amount: PRICE_CONVERSION_AMOUNT
      },
      headers: {
        'X-CMC_PRO_API_KEY': oThis.coinMarketCapApiKey
      },
      json: true,
      gzip: true
    };

    const promisesArray = [];

    for (let index = 0; index < QUOTE_CURRENCIES_ARRAY.length; index++) {
      requestOptions.qs.convert = QUOTE_CURRENCIES_ARRAY[index];
      promisesArray.push(rp(requestOptions));
    }

    const promisesResponse = await Promise.all(promisesArray);

    for (let index = 0; index < QUOTE_CURRENCIES_ARRAY.length; index++) {
      const quoteCurrency = QUOTE_CURRENCIES_ARRAY[index];
      const requestResponse = promisesResponse[index];

      if (requestResponse.status.error_code === 0) {
        if (oThis.stakeCurrencyToQuoteCurrencyPriceMap[COINMARKETCAP_OST_PREFIX][quoteCurrency]) {
          const priceFromWebApiEndpoint =
            oThis.stakeCurrencyToQuoteCurrencyPriceMap[COINMARKETCAP_OST_PREFIX][quoteCurrency];
          const priceFromAuthenticatedEndpoint = requestResponse.data.quote[quoteCurrency].price;

          oThis.checkPricePointsDifference(priceFromWebApiEndpoint, priceFromAuthenticatedEndpoint, quoteCurrency);
        } else {
          // Since data was not found using the web endpoint, we set the data obtained from authenticated endpoint.
          console.error(`Fetched OST price points from fallback method. Quote currency: ${quoteCurrency}`);

          oThis.stakeCurrencyToQuoteCurrencyPriceMap[COINMARKETCAP_OST_PREFIX][quoteCurrency] =
            requestResponse.data.quote[quoteCurrency].price;

          const errorObject = {
            internal_error_identifier: 'l_pp_gpp_3',
            api_error_identifier: 'cmc_ost_api_error',
            debug_options: { err: requestResponse, quoteCurrency: quoteCurrency }
          };

          oThis.warningsArray.push(errorObject);
        }
      } else {
        console.error(`Error in making API call. Error response: ${requestResponse}`);

        const errorObject = {
          internal_error_identifier: 'l_pp_gpp_4',
          api_error_identifier: 'cmc_ost_api_error',
          debug_options: { err: requestResponse, quoteCurrency: quoteCurrency }
        };

        oThis.errorsArray.push(errorObject);
      }
    }
  }

  /**
   * Check price points difference and send alert if needed.
   *
   * @param {number} priceFromWebApiEndpoint
   * @param {number} priceFromAuthenticatedEndpoint
   * @param {string} quoteCurrency
   *
   * @sets oThis.warningsArray
   */
  checkPricePointsDifference(priceFromWebApiEndpoint, priceFromAuthenticatedEndpoint, quoteCurrency) {
    const oThis = this;

    const priceDiff = Math.abs(priceFromWebApiEndpoint - priceFromAuthenticatedEndpoint);

    if (
      (priceDiff / priceFromWebApiEndpoint) * 100 > PERCENTAGE_THRESHOLD ||
      (priceDiff / priceFromAuthenticatedEndpoint) * 100 > PERCENTAGE_THRESHOLD
    ) {
      const errorObject = {
        internal_error_identifier: 'l_pp_gpp_5',
        api_error_identifier: 'cmc_ost_api_error',
        debug_options: {
          quoteCurrency: quoteCurrency,
          priceFromWebApiEndpoint: priceFromWebApiEndpoint,
          priceFromAuthenticatedEndpoint: priceFromAuthenticatedEndpoint
        }
      };

      oThis.warningsArray.push(errorObject);
    }
  }

  /**
   * Call coin market cap ost markets urls.
   *
   * @sets oThis.errorsArray
   *
   * @returns {Promise<void>}
   */
  async callCoinMarketCapOstMarketsUrl() {
    const oThis = this;

    const requestOptions = {
      method: 'GET',
      uri: COINMARKETCAP_OST_MARKETS_URL,
      headers: {
        scheme: 'https',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'cache-control': 'max-age=0',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': 1,
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36'
      },
      json: true,
      gzip: true
    };

    await rp(requestOptions).catch(function(err) {
      const errorObject = {
        internal_error_identifier: 'l_pp_gpp_6',
        api_error_identifier: 'cmc_markets_url_error',
        debug_options: { err: err }
      };

      oThis.errorsArray.push(errorObject);
    });
  }

  /**
   * Upload files to S3.
   *
   * @returns {Promise<void>}
   */
  async uploadToS3() {
    const oThis = this;

    console.log(`stakeCurrencyToQuoteCurrencyPriceMap: ${JSON.stringify(oThis.stakeCurrencyToQuoteCurrencyPriceMap)}`);

    for (const stakeCurrencyCoinMarketCapPrefix in oThis.stakeCurrencyToQuoteCurrencyPriceMap) {
      const stakeCurrencyPricePoints = oThis.stakeCurrencyToQuoteCurrencyPriceMap[stakeCurrencyCoinMarketCapPrefix];
      for (const quoteCurrency in stakeCurrencyPricePoints) {
        const pricePoint = stakeCurrencyPricePoints[quoteCurrency];
        const filePath =
          oThis.s3FileUrl + '/' + stakeCurrencyCoinMarketCapPrefix + '/' + quoteCurrency.toLowerCase() + '.json';

        // Create AWSS3 object.
        const AWSS3 = new AWS.S3({
          accessKeyId: S3_AWS_ACCESS_KEY,
          secretAccessKey: S3_AWS_SECRET_KEY,
          region: oThis.region
        });

        const body = { [stakeCurrencyCoinMarketCapPrefix]: { [quoteCurrency.toLowerCase()]: pricePoint.toFixed(10) } };

        await AWSS3.putObject({
          Bucket: oThis.bucketName,
          Key: filePath,
          ACL: S3_ACL,
          Body: JSON.stringify(body),
          ContentType: 'application/json'
        }).promise();
      }
    }
  }

  /**
   * Sleep for particular time.
   *
   * @param {number} ms: time in ms
   *
   * @returns {Promise<*>}
   */
  async sleep(ms) {
    console.log('Sleeping for ', ms, ' ms');

    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
}

module.exports = GetPricePoints;
