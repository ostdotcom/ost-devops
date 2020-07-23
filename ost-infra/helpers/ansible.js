'use strict';

const rootPrefix = '..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , ansibleInventoryConfigs = require(rootPrefix + `/config/ansible/inventory_configs`)
  , CommonUtil = require(rootPrefix + '/lib/utils/common')
  , AppEc2Model=require(rootPrefix + '/models/app_ec2_instances.js')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
  , nunjucks = require('nunjucks')
;

const AnsibleHelper = function (params) {
  const oThis = this;

  oThis.constants = new ConstantsKlass();
  oThis.utils = CommonUtil;
};

const AnsibleHelperPrototype = {

  baseInventoryHierarchy: function (subEnv, app, inventoryAddresses) {
    const oThis = this;

    let inventoryJson = {}
      , appServer = `${app}_servers`
    ;

    inventoryJson['all'] = {};
    inventoryJson['all']['children'] = {};
    inventoryJson['all']['children'][appServer] = {};
    inventoryJson['all']['children'][appServer]['children'] = {};
    inventoryJson['all']['children'][appServer]['children'][subEnv] = {};
    inventoryJson['all']['children'][appServer]['children'][subEnv]['hosts'] = inventoryAddresses;

    return inventoryJson;

  },

  /***
   * @param {Object} data - Ansible inventory data object
   * @param {String} data.env - Environment id
   * @param {String} data.subEnv - Sub-environment id
   * @param {String} data.app - Application identifier
   * @param {Array} data.inventoryData - IP level data
   * @param {Object} data.chainAddressData - Chain Address data
   * @param {Bool} data.lightInventory - Whether to generate light inventory file
   * @param {Array} data.activeAuxChainIds - List of active auxiliary chain ids for subEnv
   * @param {String} data.uniqueRunId - Unique run id
   */
  generateInventoryData: function (data) {
    const oThis = this;

     let  lightInventory = data['lightInventory'] || false
       , inventoryData = data['inventoryData']
       , chainAddressData = data['chainAddressData'] || {}
       , uniqueRunId = data['uniqueRunId']
       , activeAuxChainIds = data['activeAuxChainIds'] || []
       , inventoryAddresses = {}
       ;

    for(let i=0;i<inventoryData.length;i++) {

      let rowData = inventoryData[i]
        , appData = rowData['app_data']
        , addressData = {};

      if(typeof(appData) === 'string'){
        appData = JSON.parse(appData);
      }
      if(lightInventory){
        addressData['role'] = appData['role'];
      } else {
        addressData = oThis.utils.clone(appData);
      }

      if(addressData['role'] == 'app'){
        addressData['restart_group'] = i%2+1;
      }

      if(addressData['jobs']){
        let env = data['env']
          , subEnv = data['subEnv']
          , app = data['app']
          , originChainId = oThis.constants.getOriginChainId(env, subEnv)
          , ipInvConfigs = ansibleInventoryConfigs[app] || {}
          , appConfigs = oThis.utils.clone(ipInvConfigs)
          , jobsData = []
          , appJobs = addressData['jobs']
        ;

        for(let j=0;j<appJobs.length;j++){
          let job = appJobs[j]
            , jobName = job['name'].split('-')[0]
            , jobInstanceNumber = job['name'].split('-')[1]||''
            , identifier = job['identifier'] || ''
            , jobConfigs = appConfigs['jobs'][jobName]
          ;

          if(jobConfigs){

            let jobParamsTemplate = oThis.utils.clone(jobConfigs);

            // Overwrite sub-env specific variables
            if(jobParamsTemplate.hasOwnProperty(data.subEnv)){
              jobParamsTemplate = Object.assign(jobParamsTemplate, jobParamsTemplate[data.subEnv]);
            }
            if(jobParamsTemplate.hasOwnProperty(env)){
              jobParamsTemplate = Object.assign(jobParamsTemplate, jobParamsTemplate[env]);
            }

            let jobParams = oThis.constants.formatJson(
              jobParamsTemplate,
              {
                identifier: identifier,
                chainId: rowData['group_id'],
                originChainId: originChainId,
                jobInstanceNumber:jobInstanceNumber,
                env: env,
                auxChainIdsStr: activeAuxChainIds.join(',')
              }
              )
            ;
            jobParams['ip_address'] = rowData['ip_address'];
            jobsData.push(jobParams);
          }else {
            console.log(`ERROR:  ${jobName} template doesnt exist in inventory_configs`);
            return {};
          }
        }
        addressData['jobs'] = jobsData;
      }

      let ipAddr = rowData['ip_address'];
      if (chainAddressData[ipAddr]) {
        addressData = Object.assign(addressData, chainAddressData[ipAddr]);
      }
      addressData['local_outfile'] = `${oThis.constants.infraWorkspacePath()}/outfile_${rowData['ip_address']}_${uniqueRunId}.json`;
      addressData['display_name']=rowData['display_name'];
      addressData['short_name']=rowData['short_name'];
      inventoryAddresses[rowData['ip_address']] = addressData;
    }

    return inventoryAddresses;

  },

  /***
   *
   * @param {Object} options - Optional parameters
   * @param {Object} options.stackConfigs - Platform configs
   * @param {Object} options.appConfigs - Application configs data
   * @param {Object} options.env - Environment
   * @param {Object} options.app - Application identifier
   */
  getAppSpecificConfigsForSetup: function (options) {
    const oThis = this
    ;

    let configsData = {};
    let filesData = [];
    let stackData = options.stackConfigs[oThis.constants.platform.stackDataKey];
    let extraData = options.extraData;


    if(options.app === oThis.constants.ostAnalyticsApp && !(extraData.nagios_client_setup)){
      let opsConfigData = options.appConfigs[oThis.constants.appConfig.opsConfigDataKey];
      let env = new nunjucks.Environment(new nunjucks.FileSystemLoader(oThis.constants.configTemplatePath(options.app)), { autoescape: false });
      let responseString;

      let inventoryVarsObj = oThis.constants.ansible;

      let templateParams = {
        pentahoLogsDir: inventoryVarsObj.pentahoLogsDir()
      };

      if (opsConfigData.hasOwnProperty('subDomain')){
        templateParams['pentahoHostingDomain'] = opsConfigData['subDomain'];
        templateParams['pentahoHostingPort'] = 443;
        templateParams['pentahoHostingScheme'] = 'https';


        responseString = env.render('server.properties.njk', templateParams);
        filesData.push({
          fileName: 'server.properties',
          data: responseString,
          varName: 'server_properties_file'
        });

        templateParams = Object.assign(templateParams, {loginShowSampleUsersHint: false});

        responseString = env.render('pentaho.xml.njk', templateParams);
        filesData.push({
          fileName: 'pentaho.xml',
          data: responseString,
          varName: 'pentaho_xml_file'
        });

        responseString = env.render('server.xml.njk', templateParams);
        filesData.push({
          fileName: 'server.xml',
          data: responseString,
          varName: 'server_xml_file'
        });

        let heapSizes = oThis.constants.pentahoBIServerHeapSizes(options.env);
        templateParams = Object.assign(templateParams, heapSizes);

        responseString = env.render('start-pentaho.sh.njk', templateParams);
        filesData.push({
          fileName: 'start-pentaho.sh',
          data: responseString,
          varName: 'pentaho_start_script'
        });

        responseString = env.render('pentaho-server-log4j.xml.njk', templateParams);
        filesData.push({
          fileName: 'pentaho-server-log4j.xml',
          data: responseString,
          varName: 'pentaho_server_log4j'
        });

        responseString = env.render('tomcat_logging.properties.njk', templateParams);
        filesData.push({
          fileName: 'tomcat_logging.properties',
          data: responseString,
          varName: 'tomcat_logging_properties'
        });
      }

      responseString = env.render('data-integration-log4j.xml.njk', templateParams);
      filesData.push({
        fileName: 'data-integration-log4j.xml',
        data: responseString,
        varName: 'data_integration_log4j'
      });


    } else if(options.app === oThis.constants.stackApp){

      let envPath = `${oThis.constants.configTemplatePath(options.app)}/nagios`;
      let nunEnv = new nunjucks.Environment(new nunjucks.FileSystemLoader(envPath), { autoescape: false });
      let constants=oThis.constants.nagiosConstants[`${extraData.env}`] ;

      if (extraData.task === "nagios_server_setup") {
        let services=oThis.constants.getNagiosServices(extraData.env,options.app);

        let templateParams= {
          env: extraData.env,
          nrpePort: stackData['nagios']['nrpePort'],
          constants: constants,
          services: services,
          remoteAppRoot: oThis.constants.infraAppCurrentPath(),
          appLogsDir: oThis.constants.infraAppLogsDir()
        };
        let responseString = nunEnv.render("commands.cfg.njk",templateParams);
        if (!responseString  ) {
          throw 'commands.cfg file could not be created err_hel_ans_cfs1';
        }
        filesData.push({
          fileName: 'commands.cfg',
          data: responseString,
          varName: 'commands_config_file'
        });

        responseString = nunEnv.render("default.cfg.njk",{constants:constants});
        if (!responseString) {
          throw 'default.cfg file could not be created err_hel_ans_cfs2';
        }
        filesData.push({
          fileName: 'default.cfg',
          data: responseString,
          varName: 'default_config_file'
        });


        responseString = nunEnv.render("httpd.conf.njk",{});
        if (!responseString) {
          throw 'httpd.conf file could not be created err_hel_ans_cfs3';
        }
        filesData.push({
          fileName: 'httpd.conf',
          data: responseString,
          varName: 'httpd_config_file'
        });



        responseString = nunEnv.render("nagios.cfg.njk",{});
        if (!responseString) {
          throw 'nagios.cfg file could not be created err_hel_ans_cfs4';
        }
        filesData.push({
          fileName: 'nagios.cfg',
          data: responseString,
          varName: 'nagios_config_file'
        });

        responseString = nunEnv.render("cgi.cfg.njk",{nagiosBasicAuthUserName: stackData['nagios']['basicAuthUserName']});
        if (!responseString) {
          throw 'cgi.cfg file could not be created err_hel_ans_cfs5';
        }
        filesData.push({
          fileName: 'cgi.cfg',
          data: responseString,
          varName: 'cgi_config_file'
        });
      } else if (extraData.task === "add_client_config") {
        let services=oThis.constants.getNagiosServices(extraData.env,extraData.targetApp);
        let appType=['app', 'cron'];
        for(let i=0;i<appType.length;i++) {

          let _ipsPropertyName = `${appType[i]}Ips`;
          if(extraData[_ipsPropertyName].length < 1){
            continue;
          }

          let namePrefix= oThis.constants.getNagiosConfigFileName(
            {
              targetApp:extraData.targetApp,
              targetChainId:extraData.targetChainId,
              targetPlatformId: extraData.targetPlatformId,
              targetEnv: extraData.env,
              targetSubEnv: extraData.targetSubEnv
          });
          namePrefix=namePrefix+`_${appType[i]}` ;
            let hostFileName = `hosts_${namePrefix}.cfg`
            , serviceFileName = `service_${namePrefix}.cfg`
            , ips=extraData[`${_ipsPropertyName}`]
          ;


          let responseString = nunEnv.render("hosts.cfg.njk", {ips:ips,namePrefix:namePrefix,env:extraData.env});
          if (!responseString) {
            throw ' file could not be created err_hel_ans_cfs6';
          }

          filesData.push({
            fileName: hostFileName,
            data: responseString,
            varName: `host_${appType[i]}_config_file`
          });
          let filteredServices=oThis.filterServices({
            targetApp:extraData.targetApp,
            targetChainId:extraData.targetChainId,
            env: extraData.env,
            services:services,
            targetSubEnv: extraData.targetSubEnv,
            appType: appType[i]
          });

          let templateParams={
            namePrefix: namePrefix,
            services: filteredServices
          };

          responseString = nunEnv.render("services.cfg.njk", templateParams);
          if (!responseString) {
            throw' file could not be created err_hel_ans_cfs7';
          }
          filesData.push({
            fileName: serviceFileName,
            data: responseString,
            varName: `service_${appType[i]}_config_file`
          });

          templateParams= {
            env: extraData.env,
            nrpePort: stackData['nagios']['nrpePort'],
            constants: constants,
            services: services,
            remoteAppRoot: oThis.constants.infraAppCurrentPath(),
            appLogsDir: oThis.constants.infraAppLogsDir()
          };

          responseString = nunEnv.render("commands.cfg.njk",templateParams);
          if (!responseString  ) {
            throw 'commands.cfg file could not be created err_hel_ans_cfs1.1';
          }
          filesData.push({
            fileName: 'commands.cfg',
            data: responseString,
            varName: 'commands_config_file'
          });

          responseString = nunEnv.render("default.cfg.njk", {constants:constants});
          if (!responseString) {
            throw 'default.cfg file could not be created err_hel_ans_cfs2.1';
          }
          filesData.push({
            fileName: 'default.cfg',
            data: responseString,
            varName: 'default_config_file'
          });

        }
      }
    } else if (options.app == oThis.constants.utilityApp){
        let env = new nunjucks.Environment(new nunjucks.FileSystemLoader(oThis.constants.configTemplatePath(options.app)), { autoescape: false });
        let templateParams=extraData;
        let responseString = env.render('genesis.json.njk', templateParams);
         filesData.push({
           fileName: `${templateParams['chainId']}_genesis.json`,
           data: responseString,
           varName: 'genesis_file'
        });
    }

    if(extraData.task !== "nagios_server_setup"){
      let services=oThis.constants.getNagiosServices(extraData.env,options.app);
      let constants=oThis.constants.nagiosConstants[`${extraData.env}`] ;
      let envPath = `${oThis.constants.configTemplatePath(oThis.constants.stackApp)}/nagios`;
      let nunEnv = new nunjucks.Environment(new nunjucks.FileSystemLoader(envPath), { autoescape: false });
      let templateData = {
        nrpePort: stackData['nagios']['nrpePort'],
        nagiosServer: stackData['nagios']['domain'],
        services: services,
        constants: constants
      };
      let responseString = nunEnv.render("nrpe.cfg.njk", templateData);
      if (!responseString || !stackData['nagios']['nrpePort'] || !stackData['nagios']['domain']) {
        throw 'nrpe.cfg file could not be created err_hel_ans_cfs8';
      }

      filesData.push({
        fileName: 'nrpe.cfg',
        data: responseString,
        varName: 'nrpe_config_file'
      });
    }

    configsData['filesData'] = filesData;

    return configsData;
  },

  /***
   *
   * @param {Object} options - Optional parameters
   * @param {Object} options.env - env
   * @param {Object} options.targetApp - Application
   * @param {Object} options.services - nagiosServices
   * @param {Object} options.targetSubEnv - targetSubEnv to be added to service monitoring
   *  @param {Object} options.targetChainId - chainid of the service to be added
   */
  filterServices:  function(options)
  {
    const oThis = this;
    let filteredServices=[];
    let appServiceMapping=oThis.constants.getNagiosAppServiceMapping(options.env);
    let commonServices=appServiceMapping['common'];
    let appServices=[];

    let assignService;
    for(let t=0;t<commonServices.length;t++)
    {
      assignService=commonServices[t];
      filteredServices.push(options.services[`${assignService}`])
    }
    if (appServiceMapping[`${options.targetApp}`]!== undefined  || oThis.constants.isRabbitApp().includes(options.targetApp) ){

      if(oThis.constants.isRabbitApp().includes(options.targetApp) ){
        if (options.targetChainId == oThis.constants.getOriginChainId(options.env, options.targetSubEnv)) {
          appServices=appServiceMapping[`${options.targetApp}_origin`][`${options.appType}`]||[];
        }
        else if (options.targetChainId == 0 || options.targetChainId == null) {
          appServices=appServiceMapping[`${options.targetApp}_global`][`${options.appType}`]||[];
        }
        else if (options.targetChainId){
          appServices=appServiceMapping[`${options.targetApp}_aux`][`${options.appType}`]||[];
        }

      }
      else {
        appServices=appServiceMapping[`${options.targetApp}`][`${options.appType}`]||[];
      }
    }
    for(let m=0;m<appServices.length;m++)
    {
      assignService=appServices[m];
      filteredServices.push(options.services[`${assignService}`])
    }
    return filteredServices;
  },
  filterInventoryDataByCrons:async function(inventoryData,cronJobs){
    let filteredRows=[];
    for(let i=0;i<inventoryData['ec2Data'].length;i++)
    {
      let filteredJobs=[];
      let rowData=inventoryData['ec2Data'][i];
      let rowJobs=rowData['app_data']['jobs'];
      if(!rowJobs){
        continue;
      }
      for (let j=0;j<rowJobs.length;j++){
        if(cronJobs.includes(rowJobs[j]['name'])){
          filteredJobs.push(rowJobs[j]);
        }
      }
      rowData['app_data']['jobs']=filteredJobs;
      filteredRows.push(rowData);
    }
    inventoryData['ec2Data']=filteredRows;
    return inventoryData;
  },
  filterByNodeType:async function(inventoryData,nodetype){
    const oThis = this;
    let filteredrows=[];
    for(let i=0;i<inventoryData['ec2Data'].length;i++)
    {
      let rowData=inventoryData['ec2Data'][i];
      let rowNodeType=rowData['app_data']['nodeType'];
      if (rowNodeType==nodetype){
        filteredrows.push(rowData)
      }
    }
    inventoryData['ec2Data']=filteredrows;
    return inventoryData;
  }

};

Object.assign(AnsibleHelper.prototype, AnsibleHelperPrototype);
module.exports = AnsibleHelper;
