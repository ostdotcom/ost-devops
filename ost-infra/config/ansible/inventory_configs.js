"use strict";

const rootPrefix = '../..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
;

const Constants = new ConstantsKlass();

const AnsibleInventoryData = {};

AnsibleInventoryData[Constants.apiApp] = {
  jobs: {
    process_email_service_api_call_hooks: {
      identifier: "{{identifier}}",
      name: "process_email_service_api_call_hooks",
      template_params: {
        exec_path:"rake",
        exec_file_path:"RAILS_ENV={{env}} cron_task:continuous:process_email_service_api_call_hooks",
        extra_vars: "lock_key_suffix=1"
      },
      timer: "*:0/1"
    },

    usage_report:{
      identifier: "{{identifier}}",
      name: "usage_report",
      template_params: {
        exec_path:"rake",
        exec_file_path:"RAILS_ENV={{env}} usage_report",
        extra_vars: ""
      },
      timer: "05:30"
    }
  }
};

AnsibleInventoryData[Constants.saasApiApp] = {
  jobs: {
    companyLowBalanceAlertEmail:{
      identifier: "{{identifier}}",
      name: "companyLowBalanceAlertEmail",
      db_params: {
        kind: 'companyLowBalanceAlertEmail',
        cron_params: {"auxChainId":"{{chainId}}","groupId":1}
      },
      template_params: {
        exec_path:"/bin/node",
        exec_file_path:"executables/companyLowBalanceAlertEmail.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:0,30"
    },
    usdToFiatCurrencyConversion: {
      identifier: "{{identifier}}",
      name: "usdToFiatCurrencyConversion",
      db_params: {
        kind: 'usdToFiatCurrencyConversion',
        cron_params: {}
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/usdToFiatCurrencyConversion.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*-*-* 02:30:00"
    },
    auxBlockParser: {
      identifier: "{{identifier}}",
      name: "auxBlockParser",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'blockParser',
        cron_params: {"intentionalBlockDelay": 0, "chainId":"{{chainId}}"}
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/blockScanner/blockParser.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    auxTransactionParser: {
      identifier: "{{identifier}}",
      name: "auxTransactionParser",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'transactionParser',
        cron_params: {"prefetchCount": 1, "chainId":"{{chainId}}", "sequenceNumber": 1},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/blockScanner/transactionParser.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    auxTransactionParser2: {
      identifier: "{{identifier}}",
      name: "auxTransactionParser2",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'transactionParser',
        cron_params: {"prefetchCount": 1, "chainId":"{{chainId}}", "sequenceNumber": 2},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/blockScanner/transactionParser.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    auxTransactionParser3: {
      identifier: "{{identifier}}",
      name: "auxTransactionParser3",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'transactionParser',
        cron_params: {"prefetchCount": 1, "chainId":"{{chainId}}", "sequenceNumber": 3},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/blockScanner/transactionParser.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    auxFinalizer: {
      identifier: "{{identifier}}",
      name: "auxFinalizer",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'blockFinalizer',
        cron_params: {chainId: "{{chainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/blockScanner/finalizer.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    economyAggregator: {
      identifier: "{{identifier}}",
      name: "economyAggregator",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'economyAggregator',
        cron_params: {"prefetchCount": 1, "chainId": "{{chainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/blockScanner/aggregator.js ",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    workflowRouterFactory: {
      identifier: "{{identifier}}",
      name: "workflowRouterFactory",
      db_params: {
        kind: 'workflowWorker',
        cron_params: {"prefetchCount": 5, "chainId": 0, "sequenceNumber": 1},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/workflowFactory.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    originFinalizer: {
      identifier: "{{identifier}}",
      name: "originFinalizer",
      db_params: {
        kind: 'blockFinalizer',
        cron_params: {"chainId":"{{originChainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/blockScanner/finalizer.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    originBlockParser: {
      identifier: "{{identifier}}",
      name: "originBlockParser",
      db_params: {
        kind: 'blockParser',
        cron_params: {"intentionalBlockDelay": 0, "chainId":"{{originChainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/blockScanner/blockParser.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    originTransactionParser: {
      identifier: "{{identifier}}",
      name: "originTransactionParser",
      db_params: {
        kind: 'transactionParser',
        cron_params: {"prefetchCount": 1, "chainId":"{{originChainId}}", "sequenceNumber": 1},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/blockScanner/transactionParser.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    fundByMasterInternalFunderOriginChainSpecific: {
      identifier: "{{identifier}}",
      name: "fundByMasterInternalFunderOriginChainSpecific",
      db_params: {
        kind: 'fundByMasterInternalFunderOriginChainSpecific',
        cron_params: {"originChainId":"{{originChainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/funding/byMasterInternalFunder/originChainSpecific.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:0,5,10,15,20,25,30,35,40,45,50,55"
    },
    fundByMasterInternalFunderAuxChainSpecificChainAddresses: {
      identifier: "{{identifier}}",
      name: "fundByMasterInternalFunderAuxChainSpecificChainAddresses",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'fundByMasterInternalFunderAuxChainSpecificChainAddresses',
        cron_params: {"originChainId": "{{originChainId}}", "auxChainId": "{{chainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/funding/byMasterInternalFunder/auxChainSpecific/chainAddresses.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:1,6,11,16,21,26,31,36,41,46,51,56"
    },
    fundBySealerAuxChainSpecific: {
      identifier: "{{identifier}}",
      name: "fundBySealerAuxChainSpecific",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'fundBySealerAuxChainSpecific',
        cron_params: {"originChainId": "{{originChainId}}", "auxChainId": "{{chainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/funding/bySealer/auxChainSpecific.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:2,7,12,17,22,27,32,37,42,47,52,57"
    },
    fundByTokenAuxFunderAuxChainSpecific: {
      identifier: "{{identifier}}",
      name: "fundByTokenAuxFunderAuxChainSpecific",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'fundByTokenAuxFunderAuxChainSpecific',
        cron_params: {"originChainId": "{{originChainId}}", "auxChainId": "{{chainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/funding/byTokenAuxFunder/auxChainSpecific.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:3,8,13,18,23,28,33,38,43,48,53,58"
    },
    updatePriceOraclePricePoints: {
      identifier: "{{identifier}}",
      name: "updatePriceOraclePricePoints",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'updatePriceOraclePricePoints',
        cron_params: {"auxChainId": "{{chainId}}","baseCurrency":"OST"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/updatePricePoints.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:55"
    },

    fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses: {
      identifier: "{{identifier}}",
      name: "fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses',
        cron_params: {"originChainId": "{{originChainId}}", "auxChainId": "{{chainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/funding/byMasterInternalFunder/auxChainSpecific/tokenFunderAddresses.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:4,9,14,19,24,29,34,39,44,49,54,59"
    },
    fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses: {
      identifier: "{{identifier}}",
      name: "fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses',
        cron_params: {"originChainId": "{{originChainId}}", "auxChainId": "{{chainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/funding/byMasterInternalFunder/auxChainSpecific/interChainFacilitatorAddresses.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:0,6,12,18,24,30,36,42,48,54"
    },
    auxWorkflowRouterFactory: {
      identifier: "{{identifier}}",
      name: "auxWorkflowRouterFactory",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'auxWorkflowWorker',
        cron_params: {"prefetchCount": 5, "auxChainId": "{{chainId}}", "sequenceNumber": 1},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/auxWorkflowFactory.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    fundByTokenAuxFunderToExTxWorkers: {
      identifier: "{{identifier}}",
      name: "fundByTokenAuxFunderToExTxWorkers",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'fundByTokenAuxFunderToExTxWorkers',
        cron_params: {"originChainId": "{{originChainId}}", "auxChainId": "{{chainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/funding/byTokenAuxFunder/toExTxWorkers.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:0,15,30,45"
    },
    balanceSettler: {
      identifier: "{{identifier}}",
      name: "balanceSettler",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'balanceSettler',
        cron_params: {"auxChainId":"{{chainId}}", "prefetchCount":5, "sequenceNumber":1},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/blockScanner/balanceSettler.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    executeTransaction: {
      identifier: "{{identifier}}",
      name: "executeTransaction",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'executeTransaction',
        cron_params: {"prefetchCount": 25, "auxChainId": "{{chainId}}", "sequenceNumber": 1, "queueTopicSuffix": "one"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/executeTransaction.js",
        extra_vars: "--cronProcessId {{identifier}}"
      }
    },
    executeRecovery: {
      identifier: "{{identifier}}",
      name: "executeRecovery",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'executeRecovery',
        cron_params: {"chainId": "{{chainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/executeRecovery.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:0,10,20,30,40,50"
    },
    transactionErrorHandler: {
      identifier: "{{identifier}}",
      name: "transactionErrorHandler",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'transactionErrorHandler',
        cron_params: {"auxChainId":  "{{chainId}}", "noOfRowsToProcess": 50, "maxRetry": 100, "sequenceNumber": 1},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/transactionMetaObserver.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
    },
    originToAuxStateRootSync: {
      identifier: "{{identifier}}",
      name: "originToAuxStateRootSync",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'originToAuxStateRootSync',
        cron_params: { "auxChainId":  "{{chainId}}", "originChainId": "{{originChainId}}" },
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/stateRootSync/originToAux.js ",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*-*-* 11:00:00"
    },
    auxToOriginStateRootSync:{
      identifier: "{{identifier}}",
      name: "auxToOriginStateRootSync",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'auxToOriginStateRootSync',
        cron_params: {"auxChainId":  "{{chainId}}", "originChainId": "{{originChainId}}"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/stateRootSync/auxToOrigin.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*-*-* 12:00:00"
    },
    cronProcessesMonitor:{
      identifier: "{{identifier}}",
      name: "cronProcessesMonitor",
      db_params: {
        kind: 'cronProcessesMonitor',
        cron_params: {},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/cronProcessesMonitor.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:1,11,21,31,41,51"
    },
    balanceVerifier:{
      identifier: "{{identifier}}",
      name: "balanceVerifier",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'balanceVerifier',
        cron_params: {"auxChainId":"{{chainId}}",timeStamp: 1553343987},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/balanceVerifier.js ",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:5,10,15,20,25,30,35,40,45,50,55"
    },
    updateRealTimeGasPrice:{
      identifier: "{{identifier}}",
      name: "updateRealTimeGasPrice",
      db_params: {
        kind: 'updateRealTimeGasPrice',
        cron_params: {},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/updateRealTimeGasPrice.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:2,7,13,18,23,28,33,38,43,48,53,58"
    },
    generateGraph:{
      identifier: "{{identifier}}",
      name: "generateGraph",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'generateGraph',
        cron_params: {"auxChainId":"{{chainId}}"}
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/generateGraph.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
    },
    recoveryRequestsMonitor:{
      identifier: "{{identifier}}",
      name: "recoveryRequestsMonitor",
      db_params: {
        kind: 'recoveryRequestsMonitor',
        cron_params: {}
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/recoveryRequestsMonitor.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:0,30"
    },
    updatePriceOraclePricePoints_USDC: {
      identifier: "{{identifier}}",
      name: "updatePriceOraclePricePoints_USDC",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'updatePriceOraclePricePoints',
        cron_params: {"auxChainId": "{{chainId}}", "baseCurrency":"USDC"},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/updatePricePoints.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
      timer: "*:55"
    },
    webhookPreprocessor: {
      identifier: "{{identifier}}",
      name: "webhookPreprocessor",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'webhookPreprocessor',
        cron_params: {"auxChainId": "{{chainId}}", "prefetchCount":10,"sequenceNumber":1},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/webhook/preProcessor.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
    },
    webhookProcessor: {
      identifier: "{{identifier}}",
      name: "webhookProcessor",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'webhookProcessor',
        cron_params: {"auxChainId": "{{chainId}}", "prefetchCount":25,"sequenceNumber":1,"queueTopicSuffix": 'one', "subscribeSubTopic": '#'},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/webhook/processor.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
    },
    webhookErrorHandler: {
      identifier: "{{identifier}}",
      name: "webhookErrorHandler",
      group_id: "{{chainId}}",
      db_params: {
        kind: 'webhookErrorHandler',
        cron_params: {"sequenceNumber":1},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/webhook/errorHandler.js",
        extra_vars: "--cronProcessId {{identifier}}"
      },
    },
    trackLatestTransaction: {
      identifier: "{{identifier}}",
      name: "trackLatestTransaction",
      db_params: {
        kind: 'trackLatestTransaction',
        cron_params: {"chainId":0,"prefetchCount":5,"sequenceNumber":1},
      },
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/trackLatestTransaction.js ",
        extra_vars: "--cronProcessId {{identifier}}"
      },
    }



    }
};

AnsibleInventoryData[Constants.viewApp] = {
  jobs: {
    GlobalAggregatorCron: {
      identifier: "{{identifier}}",
      name: "GlobalAggregatorCron",
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/GlobalAggregatorCron.js ",
        extra_vars: "--configFile /mnt/st-company/apps/ostView/current/configuration.json"
      },
      timer: "*:0/5"
    }
  }
};

AnsibleInventoryData[Constants.ostWebApp] = {
  jobs: {
    set_dynamic_content_cache: {
      identifier: "{{identifier}}",
      name: "set_dynamic_content_cache",
      template_params: {
        exec_path: "rake",
        exec_file_path: "RAILS_ENV={{env}} cron_task:set_dynamic_content_cache ",
        extra_vars: ""
      },
      timer: "*:0,5,10,15,20,25,30,35,40,45,50,55"
    }
  }
};

AnsibleInventoryData[Constants.ostAnalyticsApp] = {
  jobs: {
    extractAndTransformDaily: {
      identifier: "{{identifier}}",
      name: "extractAndTransformDaily",
      template_params: {
        exec_path: "/bin/bash",
        exec_file_path: "executables/shell/extract_and_transform_daily.sh",
        extra_vars: ""
      },
      sandbox: {
        timer: "0,12:1"
      },
      main: {
        timer: "02:01"
      }
    },
    extractAndTransform: {
      identifier: "{{identifier}}",
      name: "extractAndTransform",
      template_params: {
        exec_path: "/bin/bash",
        exec_file_path: "executables/shell/extract_and_transform.sh",
        extra_vars: "--chain-ids {{auxChainIdsStr}}"
      },
      timer: "*:00/2"
    },
    pentahoBackupAndRestore: {
      identifier: "{{identifier}}",
      name: "pentahoBackupAndRestore",
      is_workspace_cron: true,
      template_params: {
        exec_path: "/bin/bash",
        exec_file_path: "pentaho_backup_and_restore.sh",
        extra_vars: ""
      },
      timer: "01:07"
    }
  }
};

AnsibleInventoryData[Constants.stackApp] = {
  jobs: {
    getConversionFromCoinMarketCap: {
      identifier: "{{identifier}}",
      name: "getConversionFromCoinMarketCap",
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/infra.js",
        extra_vars: "--get-conversion-from-coin-market-cap --env {{ env }}"
      },
      timer: "*:0,30"
    },
    processErrorLogs: {
      identifier: "{{identifier}}",
      name: "processErrorLogs",
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/infra.js",
        extra_vars: '--process-error-logs --env {{ env }} --severities "low,medium,high"'
      },
      timer: "*:0/5"
    },
    getFiatToFiatConversions: {
      identifier: "{{identifier}}",
      name: "getFiatToFiatConversions",
      template_params: {
        exec_path: "/bin/node",
        exec_file_path: "executables/infra.js",
        extra_vars: "--get-fiat-to-fiat-conversions --env {{ env }}"
      },
      timer: "*:0,30"
    }
  }
};

module.exports = AnsibleInventoryData;
