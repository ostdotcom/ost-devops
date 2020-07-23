'use strict';

const rootPrefix = '..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , CommonUtil = require(rootPrefix + '/lib/utils/common')
  , nunjucks = require('nunjucks')
;

const AppConfigsHelper = function (params) {
  const oThis = this;

  oThis.constants = new ConstantsKlass();
  oThis.utils = CommonUtil;
};

const HelperPrototype = {

  /***
   *
   * @param {Object} options - Optional parameters
   * @param {Object} options.appConfigs - App configuration Object
   * @param {string} options.fileName - File name
   * @param {string} options.chainId - Chain ID
   */
  generateConfigFileForLambdaCode: async function (options) {
    const oThis = this
    ;

    let appConfigs = options.appConfigs
      , fileName = options.fileName
      , opsConfigData = appConfigs['opsConfigData']
      , globalConfigs = opsConfigData['globalConfigs']['0']['config']
      , auxConfigs = opsConfigData['auxConfigs'][options.chainId]['config']
      , fileOpsObj = new FileOps()
    ;

    let lambdaConfigs = {};
    lambdaConfigs['ddbTablePrefix'] = globalConfigs['constants']['auxDdbTablePrefix'];
    lambdaConfigs['chainId'] = options.chainId;
    lambdaConfigs['elasticSearch'] = auxConfigs['elasticSearch'];

    let resp = await fileOpsObj.createFileForPath(oThis.constants.infraWorkspacePath(), fileName, 'json', lambdaConfigs);
    return resp;

  },

  /***
   *
   * @param {Object} options - Optional parameters
   * @param {Object} options.platformId - Platform identifier
   * @param {Object} options.env - Environment
   * @param {Object} options.subEnv - Sub-Environment
   * @param {Object} options.app - Application identifier
   * @param {Object} options.appConfigData - App main configuration data
   * @param {Object} options.opsConfigData - App other config data if any
   */
  getPDIConfigs: function (options) {
    const oThis = this
    ;

    let appConfigData = options.appConfigData
      , opsConfigData = options.opsConfigData
    ;

    let platformSuffix = '';
    if(options.env !== 'production'){
      platformSuffix = `_${options.env[0]}${options.platformId}`;
    }

    let templateParams = {
      subEnv: options.subEnv,
      platformSuffix: platformSuffix,
      redshiftHost: appConfigData['PRESTAGING_REDSHIFT_HOST'],
      redshiftPort: appConfigData['PRESTAGING_REDSHIFT_PORT'],
      redshiftDatabase: appConfigData['PRESTAGING_REDSHIFT_DATABASE'],
      redshiftUser: appConfigData['PRESTAGING_REDSHIFT_USER'],
      redshiftPassword: appConfigData['PRESTAGING_REDSHIFT_PASSWORD'],
      mysqlHost: opsConfigData['ANALYTICS_MYSQL_HOST'],
      mysqlPort: opsConfigData['ANALYTICS_MYSQL_PORT'],
      mysqlDatabase: opsConfigData['ANALYTICS_MYSQL_DATABASE'],
      mysqlUser: opsConfigData['ANALYTICS_MYSQL_USER'],
      mysqlPassword: opsConfigData['ANALYTICS_MYSQL_PASSWORD']
    };

    let templateParamsStr = JSON.stringify(templateParams);
    templateParamsStr = templateParamsStr.replace(/'/g, '');
    templateParams = JSON.parse(templateParamsStr);

    // let templateFile = `${oThis.constants.configTemplatePath(options.app)}/jdbc.properties.njk`;
    // nunjucks.configure({ autoescape: false });
    // let responseString = nunjucks.render(templateFile, templateParams);
    let env = new nunjucks.Environment(new nunjucks.FileSystemLoader(oThis.constants.configTemplatePath(options.app)), { autoescape: false });
    let responseString = env.render('jdbc.properties.njk', templateParams);
    // console.log("\n\n\n************* resp: ", responseString);


    return {
      stringResponse: responseString
    }
  },

  /***
   *
   * @param {Object} options - Optional parameters
   * @param {Object} options.platformId - App stack identifier
   * @param {Object} options.env - App identifier
   * @param {Object} options.subEnv - App identifier
   * @param {Object} options.app - App identifier
   */
  getBlockScannerConfigs: async function (options) {
    const oThis = this
    ;

    let AppConfigGet = require(rootPrefix + '/services/app_config/get');
    let acGetServiceObj = new AppConfigGet({platformId: options.platformId, env: options.env});
    let acGetServiceResp = await acGetServiceObj.perform({
      subEnv: options.subEnv,
      app: oThis.constants.saasApiApp
    });

    if(acGetServiceResp.err){
      return false;
    }

    let acRespData = acGetServiceResp['data']
      , opsConfigData = acRespData[oThis.constants.appConfig.opsConfigDataKey]
      , globalConfigs = opsConfigData['globalConfigs']['0']['config']
      , auxConfigs = opsConfigData['auxConfigs']
    ;

    if(!globalConfigs || !auxConfigs){
      return false;
    }

    let finalAuxConfigs = {}
      , finalOriginConfigs = {}
      , auxChainConfigs = []
      , originChainConfigs = []
    ;

    // Auxiliary chain configs for block scanner
    finalAuxConfigs['ddbTablePrefix'] = globalConfigs['constants']['auxDdbTablePrefix'];
    finalAuxConfigs['cache'] = oThis.utils.clone(globalConfigs['globalMemcached']);
    finalAuxConfigs['storage'] = oThis.utils.clone(globalConfigs['globalDynamodb']);
    finalAuxConfigs['chains'] = auxChainConfigs;

    for(let chainId in auxConfigs){
      let chainConfig = auxConfigs[chainId]['config'];

      let gethNodes = [];
      let client = chainConfig['auxGeth']['client'];
      let wsProviders = chainConfig['auxGeth']['readOnly']['wsProviders'];
      for(let i=0;i<wsProviders.length;i++){
        let endPoint = wsProviders[i];
        gethNodes.push({
          client: client,
          wsEndpoint: endPoint,
          rpcEndpoint: ''
        })
      }

      auxChainConfigs.push({
        chainId: chainId,
        cache: oThis.utils.clone(chainConfig['memcached']),
        storage: oThis.utils.clone(chainConfig['dynamodb']),
        nodes: gethNodes
      });

    }

    finalAuxConfigs['extraStorageColumns'] = oThis.utils.clone(oThis.getBlockScannerCommonConfigs());
    finalAuxConfigs['extraStorageColumns'][`${finalAuxConfigs['ddbTablePrefix']}economies`] = {
      "originContractAddress": {
        "shortName": "oca",
        "dataType": "S"
      },
      "gatewayContractAddress": {
        "shortName": "gwca",
        "dataType": "S"
      }
    };
    finalAuxConfigs['nonDDBDataSource'] = oThis.utils.clone(oThis.getBlockScannerNonDDBDataSource());

    // Origin chain configs for block scanner
    finalOriginConfigs['ddbTablePrefix'] = globalConfigs['constants']['originDdbTablePrefix'];
    finalOriginConfigs['cache'] = oThis.utils.clone(globalConfigs['globalMemcached']);
    finalOriginConfigs['storage'] = oThis.utils.clone(globalConfigs['globalDynamodb']);
    finalOriginConfigs['chains'] = originChainConfigs;

    let gethNodes = [];
    let client = globalConfigs['originGeth']['client'];
    let wsProviders = globalConfigs['originGeth']['readOnly']['wsProviders'];
    for(let i=0;i<wsProviders.length;i++){
      let endPoint = wsProviders[i];
      gethNodes.push({
        client: client,
        wsEndpoint: endPoint,
        rpcEndpoint: ''
      })
    }

    originChainConfigs.push({
      chainId: globalConfigs['originGeth']['chainId'],
      cache: oThis.utils.clone(globalConfigs['originMemcached']),
      storage: oThis.utils.clone(globalConfigs['originDynamodb']),
      nodes: gethNodes
    });

    finalOriginConfigs['extraStorageColumns'] = oThis.utils.clone(oThis.getBlockScannerCommonConfigs());
    finalOriginConfigs['nonDDBDataSource'] = oThis.utils.clone(oThis.getBlockScannerNonDDBDataSource());

    return {originConfigs: finalOriginConfigs, auxConfigs: finalAuxConfigs};

  },

  getBlockScannerNonDDBDataSource: function () {
    return {
      "transactionDetails": "chain"
    };
  },

  getBlockScannerCommonConfigs: function () {
    return {
      "transactions": {
        "metaProperty": {
          "shortName": "mp",
          "dataType": "S"
        },
        "ruleId": {
          "shortName": "rid",
          "dataType": "N"
        },
        "tokenId": {
          "shortName": "ti",
          "dataType": "N"
        },
        "kind": {
          "shortName": "kd",
          "dataType": "N"
        }
      },
      "pendingTransactions": {
        "unsettledDebits": {
          "shortName": "ud",
          "dataType": "S"
        },
        "eip1077Signature": {
          "shortName": "es",
          "dataType": "S"
        },
        "metaProperty": {
          "shortName": "mp",
          "dataType": "S"
        },
        "ruleId": {
          "shortName": "rid",
          "dataType": "N"
        },
        "status": {
          "shortName": "sts",
          "dataType": "N"
        },
        "transferExecutableData": {
          "shortName": "ted",
          "dataType": "S"
        },
        "transfers": {
          "shortName": "trs",
          "dataType": "S"
        },
        "ruleAddress": {
          "shortName": "ra",
          "dataType": "S"
        },
        "sessionKeyNonce": {
          "shortName": "skn",
          "dataType": "S"
        },
        "sessionKeyAddress": {
          "shortName": "ska",
          "dataType": "S"
        },
        "tokenId": {
          "shortName": "ti",
          "dataType": "N"
        },
        "kind": {
          "shortName": "kd",
          "dataType": "N"
        },
        "blockNumber": {
          "shortName": "bn",
          "dataType": "N"
        },
        "blockTimestamp": {
          "shortName": "bts",
          "dataType": "N"
        },
        "erc20Address": {
          "shortName": "ea",
          "dataType": "S"
        },
        "toBeSyncedInEs": {
          "shortName": "sie",
          "dataType": "N"
        }
      }
    }
  }

};

Object.assign(AppConfigsHelper.prototype, HelperPrototype);
module.exports = AppConfigsHelper;