#!/usr/bin/env node

const fileFullPath = process.argv[1].split('/');
fileFullPath.length = (fileFullPath.length - 2);
const rootPrefix = fileFullPath.join('/');

const Constants = require(rootPrefix + '/config/constants')
  , ProcessErrorLogs = require(rootPrefix + '/services/ost_infra/process_error_logs')
  , TriggerErrorLogEntry = require(rootPrefix + '/services/ost_infra/trigger_log_entry')
  , GetConversionFromCoinMarketCap = require(rootPrefix + '/services/ost_infra/get_conversion_from_coinmarketcap')
  , GetFiatToFiatConversions = require(rootPrefix + '/services/get_fiat_to_fiat_conversions')
;

const command = require('commander')
  , ConstantsObj = new Constants()
  , severities = ['high', 'medium', 'low']
  , envs = ConstantsObj.envList()
  , allowedEnvs = eval('/(' + envs.join('|') + ')/i')
;

command
  .version('0.1.0')
  .usage('[options]')
  .option('--response-out-file <string>', 'Response output file in form of JSON')
  .option('--process-error-logs', 'process Error log entries')
  .option('--lambda-invoke-create-error-log', 'Create log entry in DB via lambda function')
  .option('--get-conversion-from-coin-market-cap', 'Get currency conversion from coinmarketcap.com')
  .option('--get-fiat-to-fiat-conversions', 'Get fiat to fiat conversion from fixer')
  .option('--severities <string>', `Severities identifier [${severities}]`)
  .option('--env <string>', `Environment [${envs}]`, allowedEnvs, 'staging')
  .option('--raw-data <string>', `Raw data sent by other services like nagios`)
  .parse(process.argv)
;

const handleError = function (msg) {
  let errStr = `Required parameters are missing! - ${msg || ''}`;
  console.error('*** ', errStr, ' ***');
  command.outputHelp();
  throw errStr;
};

const commonParams = {
  platformId: ConstantsObj.ostInfraPlatform(),
  env: command.env,
  responseOutFile: command.responseOutFile
}
  , app = ConstantsObj.stackApp
  , subEnv = ConstantsObj.ostInfraSubEnv()
;

const Main = async function () {

  let performerObj = null
    , performOptions = {}
  ;

  if(command.processErrorLogs) {

    if (!command.severities) {
      handleError('Invalid option for "severities"');
    }

    performerObj = new ProcessErrorLogs(commonParams);

    performOptions = {
      app: app,
      subEnv: subEnv,
      severities: command.severities
    }

  } else if(command.lambdaInvokeCreateErrorLog){

    if (!command.rawData) {
      handleError('Invalid option for "rawData"');
    }

    performerObj = new TriggerErrorLogEntry(commonParams);

    performOptions = {
      app: app,
      subEnv: subEnv,
      rawData: command.rawData
    };

  } else if(command.getConversionFromCoinMarketCap) {

    performerObj = new GetConversionFromCoinMarketCap(commonParams);
    performOptions = {
      app: app,
      subEnv: subEnv
    };

  } else if(command.getFiatToFiatConversions) {

    performerObj = new GetFiatToFiatConversions(commonParams);
    performOptions = {
      app: app,
      subEnv: subEnv
    };
  } else {
    handleError("Common!");
  }

  console.log("performOptions: ", performOptions);
  let resp = (performerObj) ? await performerObj.perform(performOptions) : handleError();
  if(resp.err){
    throw resp;
  }
  return resp;
};

Main()
  .then(function (data) {
    console.log("Success:: ", data);
    process.exit(0);
  })
  .catch(function (err) {
    console.log("Error:: ", err);
    process.exit(1);
  })
;