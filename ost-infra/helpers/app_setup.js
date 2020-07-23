"use strict";

const rootPrefix = '..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , CommonUtil = require(rootPrefix + '/lib/utils/common')
  , EC2ServiceGetSnapshotsByTag = require(rootPrefix + '/lib/aws/ec2/get_snapshots_by_tag')
  , EC2InstanceModel = require(rootPrefix + '/models/ec2_instances')
  , AppEC2InstanceModel = require(rootPrefix + '/models/app_ec2_instances')
;

const AppSetupHelper = function (params) {
  const oThis = this
  ;

  oThis.constants = new ConstantsKlass();
  oThis.utils = CommonUtil;

  params = params || {};
};

const HelperPrototype = {

  /***
   * Get app EC2 instance EBS Volume latest snapshot id
   *
   * @constructor
   * @param {Object} options - Dictionary parameters
   * @param {String} options.app - Application identifier
   * @param {Number} options.chainId - Chain Id
   * @param {Object} options.opsConfigData - Ops configuration data
   * @param {Object} options.awsInitParams - AWS API init params
   * @returns {Object}
   */
  getLatestSnapshotIdForApp: async function (options) {
    const oThis = this
    ;

    let snapshotRespData = {};

    let opsConfigData = options.opsConfigData
      , ebsSnapshotMeta = opsConfigData['ebsSnapshots']
    ;

    if(ebsSnapshotMeta && ebsSnapshotMeta.hasOwnProperty('dataVolume')){

      snapshotRespData['dataVolume'] = opsConfigData['ebsSnapshots']['dataVolume'];

    } else if(ebsSnapshotMeta && ebsSnapshotMeta['enabled'] === true){

      let ec2ServiceObj =  new EC2ServiceGetSnapshotsByTag(options.awsInitParams);
      let snapshotResp = await ec2ServiceObj.perform({
        app: options.app, group: options.chainId, maxResults: 50
      });

      if(snapshotResp.err){
        console.log("****** Error: getLatestSnapshotIdForApp: ", snapshotResp.err);
        return false;
      }

      let snapshotData = snapshotResp.data;
      let snapLength = snapshotData['Snapshots'].length;

      if(snapLength === 0){
        console.log("****** Error: No active snapshot found!");
        return false;
      }

      let snap = snapshotData['Snapshots'][0];

      // console.log("***** 0th snap: ", snapshotData['Snapshots'][0]);
      // console.log("***** nth snap: ", snapshotData['Snapshots'][snapLength-1]);

      snapshotRespData['dataVolume'] = snap['SnapshotId'];

      let t1 = new Date(snap['StartTime'])
        , t2 = new Date()
        , allowedDelay = ebsSnapshotMeta['checkIntervalInSecs'] || 0
      ;

      // Check for stale snapshot
      if((t2-t1)/1000 > allowedDelay){
        console.log("****** Error: Stale snapshot. Allowed delay in (secs): ", allowedDelay);
        return false;
      }

      // Check for valid instance id and app
      let instanceId;
      for(let i=0;i<snap['Tags'].length;i++){
        let tag = snap['Tags'][i];

        if(tag['Key'] === 'instance-id'){
          instanceId = tag['Value'];
        }
      }

      if(!instanceId){
        console.log("****** Error: InstanceId is not associated with snapshot: ", snapshotRespData);
        return false;
      }

      let Ec2InstanceModelObj = new EC2InstanceModel();
      let ec2Instance = (await Ec2InstanceModelObj.getByInstanceIds(instanceId))[0];
      if(!ec2Instance){
        console.log("****** Error: ec2_instance not found for given instanceId: ", instanceId);
        return false;
      }
      let ec2InstanceId = ec2Instance['id'];

      let appEC2InstanceModelObj = new AppEC2InstanceModel();
      let appEC2Instances = await appEC2InstanceModelObj.getByEC2InstanceId(ec2InstanceId);
      let associatedApps = [];
      for(let i=0;i<appEC2Instances.length;i++){
        let appEc2Instance = appEC2Instances[i];
        associatedApps.push(appEc2Instance['app_id']);
      }
      associatedApps.sort();

      let appsServerList = oThis.constants.appsServerList(options.app).sort();
      if(JSON.stringify(appsServerList) !== JSON.stringify(associatedApps)){
        console.log("****** Error: Invalid app list retrieved for given ec2InstanceId: ", ec2InstanceId);
        return false;
      }

    }

    return snapshotRespData;
  }

};

Object.assign(AppSetupHelper.prototype, HelperPrototype);
module.exports = AppSetupHelper;
