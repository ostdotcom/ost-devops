'use strict';

const rootPrefix = '..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , EC2InstanceModel = require(rootPrefix + '/models/ec2_instances')
  , AppEC2InstanceModel = require(rootPrefix + '/models/app_ec2_instances')
  , AnsibleInventoryData = require(rootPrefix + `/config/ansible/inventory_configs`)
  , ChainAddressHelper = require(rootPrefix + `/helpers/chain_address`)
  , EC2ServiceGetDetails = require(rootPrefix + '/lib/aws/ec2/get_instance_details')

;

const Constants = new ConstantsKlass();

const appEc2AppStatuses = {
  setupDoneStatus: 'setupDone',
  deployReadyStatus: 'deployReady'
};

const AppEC2Helper = function (params) {
  const oThis = this;

  oThis.appEc2AppStatuses = appEc2AppStatuses;
  let appEc2AppStatusesList = [];

  for(let key in oThis.appEc2AppStatuses){
    appEc2AppStatusesList.push(oThis.appEc2AppStatuses[key]);
  }
  oThis.appEc2AppStatusesList = appEc2AppStatusesList;

};

const AppEC2HelperPrototype = {

  getNextAvailabilityZoneForEC2Instance: async function (app, stackConfigId, appType) {
    const oThis = this;

    let appEC2ModelObj = new AppEC2InstanceModel()
      , availZone1a = 0
      , availZone1b = 0
      , status = 'active'
      , activeCount = 0
    ;
    let appEC2ModelResp = await appEC2ModelObj.getByAppIdStackConfigId(app, stackConfigId,status);

    if(appEC2ModelResp && appEC2ModelResp.length > 0){

      let ec2InstanceIds = []
      ;
      activeCount = appEC2ModelResp.length;
      for(let i=0;i<activeCount;i++){
        let row = appEC2ModelResp[i]
          , appData = JSON.parse(row['app_data'])
        ;
        if(appData['role'] == appType){
          ec2InstanceIds.push(row['ec2_instance_id'])
        }
      }

      if(ec2InstanceIds.length > 0){
        let Ec2ModelObj = new EC2InstanceModel();
        let modelResp = await Ec2ModelObj.getByIds(ec2InstanceIds);
        for(let i=0;i<modelResp.length;i++){
          let row = modelResp[i]
            , instanceData = JSON.parse(row['data'])
          ;

          if(instanceData['Placement']['AvailabilityZone'].includes('1a')){
            availZone1a += 1;
          } else {
            availZone1b += 1;
          }

        }
      }
    }

    let availZone = (availZone1a > availZone1b ? '1b' : '1a');

    return {activeCount: activeCount, availZone: availZone}
  },

  toggleAvailZone: function (current) {
    return current === '1a' ? '1b' : '1a';
  },

  /* Get app Ec2 instance id
  *
  * @param {Object} options - Dictionary parameters
  * @param {Number} options.stackConfigId - Stack config Id
  * @param {string} options.app - Application identifier
  * @param {string} options.chainId - Chain Id
  * @param {string} options.ipAddresses - Comma separated machine IPs
  * @param {string} options.plainText - text used to encrypt or decrypt data
  * @param {string} options.status - status of the machines in DB
  * @returns {Object}
  */
  getInstanceIds: async function(options){
    const oThis = this;

    let appInstanceIds = []
      , cronInstanceIds = []
      , cronPriorityInstanceIds = []
      , appInstanceEc2Ids = []
      , cronPriorityEc2Ids = []
      , cronInstanceEc2Ids = []
      , pendingStatusEc2Ids = []
      , instanceIdsMap = {}
      ;

    let inventoryData = await oThis.getAppEC2Data({
      stackConfigId: options.stackConfigId,
      app:  options.app,
      plainText: options.plainText,
      ipAddresses: options.ipAddresses,
      chainId:options.chainId,
      status: options.status
    });

    let inventoryEc2Data = inventoryData['ec2Data'];
    let distinctGroupIds = [];
    if (inventoryEc2Data.length > 0) {
      for(let i =0;i<inventoryEc2Data.length;i++){
        let row = inventoryEc2Data[i]
          , groupId = row['group_id']
        ;

        if(groupId && !distinctGroupIds.includes(groupId) ){
          distinctGroupIds.push(groupId);
        }

        if(row['app_data']['role'] === "app"){
          appInstanceIds.push(row['ec2_instance_id'])
        } else if(row['app_data']['role'] === "cron" && row['app_data']['priority']) {
          cronPriorityInstanceIds.push(row['ec2_instance_id'])
        } else {
          cronInstanceIds.push(row['ec2_instance_id'])
        }
      }

      let allInstanceIds = appInstanceIds.concat(cronPriorityInstanceIds).concat(cronInstanceIds);

      if(allInstanceIds.length > 0){
        let Ec2ModelObj = new EC2InstanceModel();
        let modelResp = await Ec2ModelObj.getByIds(allInstanceIds);
        for(let i=0;i<modelResp.length;i++) {
          let row = modelResp[i];
          if(appInstanceIds.includes(row['id'])){
            appInstanceEc2Ids.push(row['instance_id']);
          } else if(cronInstanceEc2Ids.includes(row['id'])){
            cronInstanceEc2Ids.push(row['instance_id']);
          } else {
            cronPriorityEc2Ids.push(row['instance_id']);
          }

          if(Constants.ec2PendingStatuses.includes(row['status'])){
            pendingStatusEc2Ids.push(row['instance_id']);
          }

          Object.assign(instanceIdsMap,{[row['instance_id']]: row['id']});
        }
      }
    }

    return {
      instanceIdsMap: instanceIdsMap,
      appInstanceEc2Ids: appInstanceEc2Ids,
      cronInstanceEc2Ids: cronInstanceEc2Ids,
      cronPriorityInstanceEc2Ids: cronPriorityEc2Ids,
      pendingStatusEc2Ids: pendingStatusEc2Ids,
      activeGroupIds: distinctGroupIds
    }
  },

  getAppDataKeyMap: function (app) {
    let appDataKeysList = Constants.availableAppDataKeys(app);

    let appDataKeys = {};
    for(let i=0;i<appDataKeysList.length;i++){
      let item = appDataKeysList[i];
      appDataKeys[item.key] = item;
    }

    return appDataKeys;
  },

  parseAppData: function (app, appData) {
    const oThis = this;

    let appDataObj = {};

    if(appData){

      let appDataKeys = oThis.getAppDataKeyMap(app);

      let rawData = appData.match(/(?:[^\s"]+|"[^"]*")+/g);

      for(let i=0;i<rawData.length;i++){
        let kvPair = rawData[i].split('=');
        let key = kvPair[0]
          , val = kvPair[1]
        ;

        if(!key || !val){
          return false;
        }

        key = key.trim();
        val = val.trim();

        let quoteReplacedStr = val.replace(/["']/g, "");

        if(key.length < 1 || quoteReplacedStr.length < 1){
          continue;
        }

        let keyItem = appDataKeys[key];
        if(keyItem && keyItem.keyType === 'list') {

          let itemList = quoteReplacedStr.split(',').map(str => str.trim())
            , finalItems = []
          ;

          for (let j = 0; j < itemList.length; j++) {
            let item = itemList[j].trim();

            if (key === 'jobs') {
              finalItems.push({name: item});
            } else {
              finalItems.push(item);
            }
          }

          appDataObj[key] = finalItems;
        } else if(keyItem && keyItem.keyType === 'boolean'){
          appDataObj[key] = JSON.parse(quoteReplacedStr);
        } else {
          appDataObj[key] = quoteReplacedStr;
        }
      }
    }

    return appDataObj;
  },

  mergeAppDataForApp: function (app, fromAppData, toAppData, filter = []) {
    const oThis = this;

    let appDataKeys = oThis.getAppDataKeyMap(app);
    let hasFilter = (filter.length > 0);
    let filteredAppData={};
    for(let dataKey in fromAppData){
      let keyItem = appDataKeys[dataKey];

      if(!hasFilter || (hasFilter && filter.includes(dataKey))){

        if(toAppData[dataKey]){

          if(keyItem && keyItem.keyType === 'list'){
            filteredAppData[dataKey] = toAppData[dataKey].concat(fromAppData[dataKey]);
          } else {
            filteredAppData[dataKey] = fromAppData[dataKey]
          }
        } else {
          console.log("^^^^^^^^ No data Key in toAppData ::: ", dataKey);
          filteredAppData[dataKey] = fromAppData[dataKey]
        }
      }
    }

    return filteredAppData;

  },

  validateAppData: function (appData, app) {
    const oThis = this;

    let jobsData = (AnsibleInventoryData[app] || {})['jobs'];

    let appDataKeys = oThis.getAppDataKeyMap(app)
      , availableDataKeys = Object.keys(appDataKeys)
    ;

    for(let key in appData){

      let itemData = appData[key];
      if(!availableDataKeys.includes(key)){
        console.log(`Error: Data key: "${key}" is not allowed for app: ${app}`);
        return false;
      }

      if(appDataKeys[key].keyType === 'list'){


        for(let i=0;i<itemData.length;i++){

          let listItem = itemData[i];
          if(listItem === ''){
            console.log(`Error: Invalid list item for key: "${key}" for app: ${app}`);
            return false;
          }

          if(key === 'jobs'){
            if(!jobsData.hasOwnProperty(listItem.name.split('-')[0])){
              console.log(`Error: No job available for key: "${key}" => "${listItem.name}" for app: ${app}`);
              return false;
            }
          }
        }
      }

    }

    return appData;
  },

  /***
   * Get app Ec2 instance data for ansible inventory generation
   *
   * @constructor
   * @param {Object} options - Dictionary parameters
   * @param {Number} options.stackConfigId - Stack config Id
   * @param {string} options.app - Application identifier
   * @param {Number} options.chainId - Chain Id
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @param {string} options.plainText - text used to encrypt or decrypt data
   * @param {string} options.status - status of the machines in DB
   * @param {Array} options.appStatus - App setup status that needs to be considered
   * @returns {Object}
   */
  getAppEC2Data: async function (options) {
    const oThis = this;

    // Get EC2 ip list with data
    if(typeof(options.status) === 'undefined'){
      options.status = 'active';
    }

    let appEC22InstanceObj = new AppEC2InstanceModel()
      , appEC22InstanceResp = await appEC22InstanceObj.getByAppIdStackConfigId(options.app, options.stackConfigId, options.status)
    ;

    let filteredRows = []
      , chainAddressIdAndIpMap = {}
      , chainEnodes = []
      , primarySealerChainAddressId = null
    ;

    let appStatus = options.appStatus;
    let isNot = appStatus && appStatus[0] === '!';
    if(isNot){
      appStatus = appStatus.replace('!', '');
    }

    for(let i=0;i<appEC22InstanceResp.length;i++){

      let rowData = appEC22InstanceResp[i];

      if(options.chainId && options.chainId >= 0 && options.chainId !== rowData['group_id']){
        continue;
      }
      if(Array.isArray(options.ipAddresses) && !options.ipAddresses.includes(rowData['ip_address'])){
        continue;
      }

      rowData['app_data'] = JSON.parse(rowData['app_data']);
      let appData = rowData['app_data'];
      let ipSuffix= rowData['ip_address'].split('.').slice(2).join('.');
      let shortName;
      if(appData['nodeType']){
        shortName=rowData['app_id']+'_'+appData['nodeType']+'_'+ipSuffix;
      }
      else{
        shortName=rowData['app_id']+'_'+appData['role']+'_'+ipSuffix;
      }
      rowData['short_name']=shortName;
      rowData['display_name']= rowData['stack_id']+'_'+rowData['env'][0]+'_'+rowData['sub_env'][0]+'_'+shortName;
      let appStatuses = rowData['app_status'] || {};
      if(typeof(appStatuses) === 'string'){
        appStatuses = JSON.parse(appStatuses);
      }

      // Check if app is ready for deployment or not
      if(appStatus){
        if(isNot){
          if(appStatuses[appStatus]){
            continue
          }
        } else {
          if(!appStatuses[appStatus]){
            continue
          }
        }
      }

      if(appData['chainAddressId']){
        if(appData['isPrimarySealer']){
          primarySealerChainAddressId = appData['chainAddressId'];
        }
        chainAddressIdAndIpMap[appData['chainAddressId']] = rowData['ip_address'];
      }

      if(appData['enode']){
        chainEnodes.push(appData['enode'])
      }

      filteredRows.push(rowData);

    }

    // Get chain Address data if exists in inventory data
    let chainAddrHelperObj = new ChainAddressHelper();

    let chainAddressFullData = await chainAddrHelperObj.getAddressData({
      chainAddressIdsMap: chainAddressIdAndIpMap,
      primarySealerChainAddressId: primarySealerChainAddressId,
      plainText: options.plainText
    });
    return {
      ec2Data: filteredRows,
      chainAddressData: chainAddressFullData['chainAddressData'],
      chainEnodes: chainEnodes,
      primarySealerAddress: chainAddressFullData['primarySealerAddress'],
    };
  },

  /***
   * Get app Ec2 instance data for ansible inventory generation
   *
   * @constructor
   * @param {Object} options - Dictionary parameters
   * @param {Number} options.stackConfigId - Stack config Id
   * @param {string} options.app - Application identifier
   * @param {string} options.chainId - Chain Id
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @param {string} options.plainText - text used to encrypt or decrypt data
   * @param {string} options.status - status of the machines in DB
   * @returns {Object}
   */
  getAppEC2DataForAppSetup: async function (options) {
    const oThis = this;

    let resp = await oThis.getAppEC2Data(options);
    let ec2data = resp['ec2Data'];
    let filteredRows = [];

    for(let i=0;i<ec2data.length;i++){

      let rowData = ec2data[i];
      let statusData = JSON.parse(rowData['app_status'] ? rowData['app_status'] : '{}');
      if(statusData[appEc2AppStatuses.setupDoneStatus] === true){
        continue;
      }
      filteredRows.push(rowData);
    }

    resp['ec2Data'] = filteredRows;
    return resp;
  },

  /***
   * Append app status data with key setupDone
   *
   * @constructor
   * @param {Object} options - Dictionary parameters
   * @param {Number} options.ec2Data - app Ec2 instance rows
   * @returns {Object}
   */
  updateAppEC2AppStatusToSetupDone: async function (ec2Data) {
    const oThis = this;

    return oThis.setAppEC2AppStatusForType(appEc2AppStatuses.setupDoneStatus, ec2Data);
  },

  setAppEC2AppStatusForType: async function (statusType, data) {

    let resp = []
      , statusData = {}
    ;
    statusData[statusType] = true;
    for(let i=0;i<data.length;i++){
      let ele = data[i];
      if(typeof(ele) === 'object'){
        ele = ele['id'];
      }
      let appEC22InstanceObj = new AppEC2InstanceModel();

      resp.push(await appEC22InstanceObj.appendAppStatusDataById(statusData, ele));
    }

    return resp;
  },

  /***
   * Filter inventory data based on role
   * @param {Object} options - Dictionary parameters
   * @param {string} options.role - app or cron
   * @param {array} options.ec2Data
   *
   * @returns {Object}
   */
  filterByRole:async function (options) {
    let filteredRows = [];
    let ec2Data=options.ec2Data;

    for(let i=0;i<ec2Data.length;i++){
      let rowData= ec2Data[i];
      if(rowData['app_data']['role'] !== options.role){
        continue;
      }
      filteredRows.push(rowData);
    }
    return {
      ec2Data:filteredRows
    }
  },

  /***
   * Filter inventory data based on status
   * @param {Object} options - Dictionary parameters
   * @param {array} options.statuses - app or cron
   * @param {array} options.ec2Data
   *
   * @returns {Object}
   */
  filterByStatus:async function (options) {
    let filteredRows = [];
    let ec2Data=options.ec2Data;

    for(let i=0;i<ec2Data.length;i++){
      let rowData= ec2Data[i];
      if(options.statuses.length>0 && options.statuses.includes(rowData['status'])  ){
        filteredRows.push(rowData);
      }
    }
    return {
      ec2Data:filteredRows
    }
  },
  /***
   * Filter inventory data to get nagios server
   *
   * @param {array} options.ec2Data
   *
   * @returns {Object}
   */
  filterNagiosServer:async function (options) {
    let filteredRows = [];
    let ec2Data=options.ec2Data;

    for(let i=0;i<ec2Data.length;i++){
      let rowData= ec2Data[i];
      if(!rowData['app_data']['nagios_server'] ){
        continue;
      }
      filteredRows.push(rowData);
    }
    return {
      ec2Data:filteredRows
    }
  },
  /**
   * updateStatusinDB- update ec2 instance and app_ec2instance table
   * @param {Object} options - Create service parameters
   * @param {map} options.instanceIdsMap - instance ids and DB table id map
   * @param {string} options.app - Application identifier
   * @param {string} options.awsConnectionParams - required to get aws access
   * @returns
   */
  updateEc2StatusAndDataInDB: async function(options){
    const oThis = this;

    let instanceIds = Object.keys(options.instanceIdsMap);
    ;

    let getServiceObj = new EC2ServiceGetDetails(options.awsConnectionParams);

    for(let i=0;i<instanceIds.length;i++){

      let instanceId = instanceIds[i];
      let ec2DetailsRespData = await getServiceObj.perform({app: options.app, instanceIds: [instanceId]});
      let awsStatus = null
        , ec2Details = null
      ;

      if(ec2DetailsRespData.data){
        let ec2Data = ec2DetailsRespData.data
          , reservationsData = ec2Data['Reservations'][0]
        ;
        if(reservationsData){
          ec2Details = reservationsData['Instances'][0];
          awsStatus = ec2Details['State']['Name'];
        }
      }

      await oThis.updateEc2DataInDB(instanceId, options.instanceIdsMap[instanceId], awsStatus, ec2Details);
    }

    return true;
  },

  updateEc2DataInDB: async function (instanceId, ec2InstanceId, awsStatus, ec2Details = null) {
    let ec2Model = new EC2InstanceModel();
    let ec2UpdateResp = await ec2Model.updateStatusAndDataByInstanceId(instanceId, awsStatus, ec2Details);
    let appEC2Model = new AppEC2InstanceModel();
    let appEC2UpdateResp = await appEC2Model.updateStatusByEc2InstanceId(ec2InstanceId, awsStatus);
  },

  getInstanceDetailsMap: function (ec2Data) {
    const oThis = this;
    let reservationsData = ec2Data['Reservations']
      , ec2DetailsMap = {}
    ;
    for(let i=0;i<reservationsData.length;i++){
      let reservationDetails = reservationsData[i]
        , instancesData = reservationDetails['Instances']
      ;

      for(let j=0;j<instancesData.length;j++){
        let instanceDetails = instancesData[j];
        ec2DetailsMap[instanceDetails['InstanceId']] = instanceDetails;
      }
    }

    return ec2DetailsMap;
  },

  formatAppDataJobs: async function(appData,app){
    const oThis = this;
    let jobsData = (AnsibleInventoryData[app] || {})['jobs'];
    if (!appData['jobs']) {
      return appData;
    }
    for (let i=0;i<appData['jobs'].length;i++){
      let job=appData['jobs'][i];
      if(job.name.split('-').length === 1){
        if(jobsData[job.name]['hasMultipleInstances']){
          job.name = job.name + `-${Date.now()+i}`
        }
      }
    }
    return appData;
  },

  /***
   * Append cron job to jobs array in app data
   *
   * @constructor
   * @param {Object} options - Dictionary parameters
   * @param {String} options.cronJobs - Comma separated Cron job identifiers
   * @param {Array} options.ipAddresses - List of ip addresses where jobs to be appended
   * @param {String} options.app - Application identifier
   * @param {Number} options.stackConfigId - Stack Config Id
   * @returns {Object}
   */
  appendCronJobsToAppData: async function (options) {
    const oThis = this;

    let cronJobs = options.cronJobs
      , ipAddresses = options.ipAddresses
      , app = options.app
      , stackConfigId = options.stackConfigId
    ;

    let parsedAppData = oThis.parseAppData(app, `jobs="${cronJobs}"`);
    let validatedAppData = oThis.validateAppData(parsedAppData, app);

    if(!validatedAppData || Object.keys(validatedAppData).length < 1){
      console.log(`\nWarning: Invalid app data for jobs: "${cronJobs}"\n`);
      return false;
    }

    for(let i=0;i<ipAddresses.length;i++){
      let ipA = ipAddresses[i];

      // Get cron jobs data from DB
      let appEC2ModelObj = new AppEC2InstanceModel();
      let rowData = (await appEC2ModelObj.getByAppIdStackConfigIdAndIpAddresses(app, stackConfigId, ipA))[0];

      if(!rowData){
        console.log(`\nWarning: No active entry exists in DB for ip: ${ipA}\n`);
        return false;
      }

      let appData = JSON.parse(rowData['app_data']);
      appData['jobs'] = appData['jobs'] || [];
      appData['jobs'] = appData['jobs'].concat(validatedAppData['jobs']);
      appData= await oThis.formatAppDataJobs(appData,app);
      // Update App jobs data for ip
      appEC2ModelObj = new AppEC2InstanceModel();
      let updateResp = await appEC2ModelObj.updateAppDataById(appData, rowData['id']);
      if(updateResp && updateResp['affectedRows'] < 1){
        console.log(`\nWarning: DB update failed for jobs data for ip: ${ipA}\n - ${JSON.stringify(appData)}`);
        return false;
      }
    }
    return true;
  },

  /***
   * Mark machines are deploy-ready
   *
   * @constructor
   * @param {Object} options - Dictionary parameters
   * @param {Array} options.ipAddresses - List of ip addresses
   * @param {String} options.app - Application identifier
   * @param {Number} options.stackConfigId - Stack Config Id
   * @returns {Object}
   */
  markDeployReady: async function (options) {

    let appEC22InstanceObj = new AppEC2InstanceModel()
      , appEC22InstanceResp = await appEC22InstanceObj.getByAppIdStackConfigId(options.app, options.stackConfigId, 'active')
    ;

    let filteredRowIds = [];

    for(let i=0;i<appEC22InstanceResp.length;i++){

      let rowData = appEC22InstanceResp[i];
      let appStatus = JSON.parse(rowData['app_status']);

      if(options.ipAddresses.includes(rowData['ip_address']) && rowData['status'] === 'active' && !appStatus[appEc2AppStatuses.deployReadyStatus]){
        filteredRowIds.push(rowData['id'])
      }

    }

    if(filteredRowIds.length > 0){
      console.log(`***** Marking deploy-ready for following app ec2 ids: ${filteredRowIds} *****`);
      appEC22InstanceObj = new AppEC2InstanceModel();
      await appEC22InstanceObj.appendAppStatusDataById({[appEc2AppStatuses.deployReadyStatus]: true}, filteredRowIds);
    } else {
      console.log(`***** No active ips found for app: ${options.app} *****`);
    }

    return true;

  },

  /***
   * Mark machines are deploy-ready
   *
   * @param {Object} options - Dictionary parameters
   * @param {Number} options.stackConfigId - Stack config Id
   * @param {string} options.app - Application identifier
   * @param {string} options.chainId - Chain Id
   * @param {string} options.ipAddresses - Comma separated machine IPs
   * @param {string} options.plainText - text used to encrypt or decrypt data
   * @param {string} options.status - status of the machines in DB/AWS
   * @param {Array} options.appStatus - App setup statuses that needs to be considered
   * @returns {Object}
   */
  getFormattedAppEc2Data: async function (options) {
    const oThis = this;

    let resp = [];

    let appEc2Data = await oThis.getAppEC2Data(options);
    let ec2Data = appEc2Data['ec2Data'];

    if(ec2Data.length < 1){
      return resp;
    }

    // Get EC2 Instance details from DB
    let instanceDataMap = {};
    let instanceIds = [];
    ec2Data.filter(obj => instanceIds.push(obj['ec2_instance_id']));
    let Ec2ModelObj = new EC2InstanceModel();
    let modelResp = await Ec2ModelObj.getByIds(instanceIds);
    for(let i=0;i < modelResp.length;i++){
      let row = modelResp[i]
        , instanceData = JSON.parse(row['data'])
      ;

      let rData = {
        instanceId: instanceData['InstanceId'],
        instanceType: instanceData['InstanceType']
      };

      // Parse tag data
      for(let j=0;j<instanceData['Tags'].length;j++){
        let tagData = instanceData['Tags'][j];
        if(tagData.Key === 'AppName'){
          rData.appName = tagData.Value;
        }
        if(tagData.Key === 'Name'){
          rData.name = tagData.Value;
        }
      }

      instanceDataMap[row['id']] = rData;

    }

    // Format data
    for(let i=0;i<ec2Data.length;i++){

      let rowData = ec2Data[i];
      let appData = rowData['app_data'] || {};
      if(typeof(appData) === 'string'){
        appData = JSON.parse(appData);
      }

      let appStatuses = rowData['app_status'] || {};
      if(typeof(appStatuses) === 'string'){
        appStatuses = JSON.parse(appStatuses);
      }

      let formattedRowData = {
        ipAddress: rowData['ip_address'],
        groupId: rowData['group_id'],
        role: appData['role'],
        jobs: appData['jobs']
      };

      // Add AWS ec2 data
      formattedRowData = Object.assign(formattedRowData, instanceDataMap[rowData['ec2_instance_id']]);

      resp.push(formattedRowData);

    }

    return resp;

  }

};

Object.assign(AppEC2Helper.prototype, AppEC2HelperPrototype);
module.exports = AppEC2Helper;
