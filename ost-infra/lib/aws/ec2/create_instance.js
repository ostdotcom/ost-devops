"use strict";

const rootPrefix = '../../..'
  , Ec2ServiceBaseKlass = require(rootPrefix + '/lib/aws/base')
;

/**
 * constructor
 *
 * @param {Object} params - EC2 create params
 *
 * @constructor
 */
const Ec2ServiceCreateKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

Ec2ServiceCreateKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
Ec2ServiceCreateKlass.prototype.constructor = Ec2ServiceCreateKlass;

const Ec2ServicePrototype = {

  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

    options.instanceType = options.instanceType || 't2.nano';
    options.volumeSize = options.volumeSize || 15;
    options.volumeType = options.volumeType || 'standard';
    options.appType = options.appType || 'app';
    options.availabilityZone = options.availabilityZone || '1a';

  },

  /**
   * Create EC2 instance
   *
   * @return {Promise<Result>} - Create instance promise results
   */
  perform: async function (options) {
    const oThis = this
    ;

    // Create instance
    return Ec2ServiceBaseKlass.prototype.perform.call(oThis, options);

  },

  /**
   * Perform EC2 instance create action
   *
   * @return {Array<Promise Result>} - Return
   */
  asyncPerform: function(options) {
    const oThis = this
    ;

    return createEc2Instance.call(oThis, options);
  },

  validate: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.validate.call(oThis, options);

    if(!options.appType || options.appType == ''){

      throw oThis.getError(`Invalid appType for ${oThis.constructor.name}`, 'err_ec2_ci_veo_2');
    }

    if(!options.name || options.name == ''){

      throw oThis.getError(`Invalid name for ${oThis.constructor.name}`, 'err_ec2_ci_veo_3');
    }

  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.name
* - options.appType
* - options.availabilityZone
* - options.instanceType
* - options.volumeSize
* - options.volumeType
* - options.dataVolSnapId
* - options.nodeType
* - options.group
* - options.rootVolSnapId
* - options.imageId
* - options.UserData
*
* */
var createEc2Instance = function (options) {
  const oThis = this
  ;

  var constantsObj = oThis.constantsObj
    , constants = oThis.utils.clone(constantsObj.getConstants())
    , ec2Params = Object.assign({}, constants.ec2)
    , appParams = Object.assign({}, constants[options.app])
    , extParams = {}
  ;

  // Assign subnet
  let subnetGroups = Object.assign({}, appParams['SubnetId_' + options.availabilityZone||'1a']);
  let subNetIdMap = subnetGroups[options.subEnv];
  console.log("subnetGroups::::")
  // Assign Security groups

  let securityGroupsMap =  Object.assign({}, (appParams['SecurityGroupIds_' + options.appType] || {})[options.subEnv]);
  securityGroupsMap = Object.assign(securityGroupsMap, (appParams['SecurityGroupIds_' + options.nodeType] || {})[options.subEnv]);

  let ec2NewtorkInterfaces = constantsObj.ec2NewtorkInterfaces(options.availabilityZone, subNetIdMap, securityGroupsMap);

  extParams = Object.assign(extParams, ec2NewtorkInterfaces);

  // Assign Proper key name for ssh
  let keyName = `KeyName_${options.subEnv}`;
  extParams = Object.assign(extParams, ec2Params[keyName]);
  if(appParams[keyName]){
    extParams = Object.assign(extParams, appParams[keyName])
  }


  // Change volume size and type
  var dataVolumeMap = Object.assign({}, ec2Params.dataVolumeMap);
  if(appParams.dataVolumeMap){
    dataVolumeMap = Object.assign({}, appParams.dataVolumeMap);
  }
  dataVolumeMap['Ebs']['VolumeSize'] = options.volumeSize;
  dataVolumeMap['Ebs']['VolumeType'] = options.volumeType;
  if(options.dataVolSnapId){
    dataVolumeMap['Ebs']['SnapshotId'] = options.dataVolSnapId;
  }

  // Assign disk volumes
  let instanceParams = Object.assign({}, ec2Params.ec2);
  if(appParams.ec2){
    instanceParams = Object.assign(instanceParams, appParams.ec2);
  }
  instanceParams = Object.assign(instanceParams, extParams);
  instanceParams['BlockDeviceMappings'].push(dataVolumeMap);
  let rootVolumeMap = Object.assign({}, ec2Params.rootVolumeMap);
  if(appParams.rootVolumeMap){
    rootVolumeMap = Object.assign({}, appParams.rootVolumeMap);
  }

  if(options.rootVolSnapId){
    rootVolumeMap['Ebs']['SnapshotId'] = options.rootVolSnapId;
  }
  instanceParams['BlockDeviceMappings'].push(rootVolumeMap);

  // Assign instance type
  instanceParams['InstanceType'] = options.instanceType;

  // Attach IAM instance profile role
  let ec2ProfileRole = appParams['ec2InstanceProfileRoleARN'];
  if(!ec2ProfileRole){
    ec2ProfileRole = ec2Params['ec2InstanceProfileRoleARN'];
  }
  instanceParams['IamInstanceProfile'] = {
    'Arn': constantsObj.formatStr(ec2ProfileRole, {awsAccountId: oThis.awsAccountId})
  };
  if(options.imageId){
    instanceParams['ImageId']=options.imageId;
  }
  // Assign tags
  let tagsData = [];

  var nameTag = ec2Params.nameTag;
  let ec2NmaePrefix = constantsObj.ec2NamePrefix();
  nameTag = Object.assign(nameTag, {Value: `${ec2NmaePrefix} ${options.app} ${options.name}`});
  tagsData.push(nameTag);

  var purposeTag = ec2Params.purposeTag;
  purposeTag = Object.assign(purposeTag, {Value: `${options.appType}`});
  tagsData.push(purposeTag);

  var appNameTag = ec2Params.appNameTag;
  appNameTag = Object.assign(appNameTag, {Value: `${options.app}`});
  tagsData.push(appNameTag);

  var envTag = ec2Params.envTag;
  envTag = Object.assign(envTag, {Value: oThis.env});
  tagsData.push(envTag);

  var subEnvTag = ec2Params.subEnvTag;
  subEnvTag = Object.assign(subEnvTag, {Value: oThis.subEnv});
  tagsData.push(subEnvTag);

  var appEnvTag = ec2Params.appEnvTag;
  appEnvTag = Object.assign(appEnvTag, {Value: `${options.app}-${oThis.env}`});
  tagsData.push(appEnvTag);

  if(options.group && options.group.length > 0){
    var groupTag = ec2Params.groupTag;
    groupTag = Object.assign(groupTag, {Value: `${options.group}`});
    tagsData.push(groupTag);
  }

  let instanceTags = {
    ResourceType: 'instance',
    Tags: tagsData
  };
  let volumeTags = {
    ResourceType: 'volume',
    Tags: tagsData
  };

  instanceParams.TagSpecifications = [instanceTags, volumeTags];
  if(options.UserData){
    instanceParams['UserData']=options.UserData;
  }
  return oThis._awsServiceRequest('oThis.awsClient.ec2()', 'runInstances', instanceParams);

};

Object.assign(Ec2ServiceCreateKlass.prototype, Ec2ServicePrototype);
module.exports = Ec2ServiceCreateKlass;
