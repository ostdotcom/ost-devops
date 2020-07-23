"use strict";

const rootPrefix = '../../..'
  , Ec2ServiceBaseKlass = require(rootPrefix + '/lib/aws/base')
;

/**
 * constructor
 *
 * @param {Object} params
 *
 * @constructor
 */
const CreateESDomainKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

CreateESDomainKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
CreateESDomainKlass.prototype.constructor = CreateESDomainKlass;

const Ec2ServicePrototype = {

  /**
   * Initialize values
   */
  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

    // Set default values
    options.ebsVolumeSize = options.ebsVolumeSize || 10;
    options.ebsVolumeType = options.ebsVolumeType || 'gp2';
    options.clusterMasterCount = options.clusterMasterCount || 0;
    options.clusterInstanceCount = options.clusterInstanceCount || 1;
    options.clusterInstanceType = options.clusterInstanceType || 't2.small.elasticsearch';
    options.availabilityZone = options.availabilityZone || '1a'

  },

  /**
   * Create ES Domain
   *
   * @return {Promise<Result>}
   */
  perform: async function (options) {
    const oThis = this
    ;

    // Create instance
    return Ec2ServiceBaseKlass.prototype.perform.call(oThis, options);

  },

  /**
   * Perform action
   *
   * @return {Promise}
   */
  asyncPerform: function(options) {
    const oThis = this
    ;

    return _performMethod.call(oThis, options);
  },

  /**
   * validate passed parameters
   */
  validate: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.validate.call(oThis, options);

    if(!options.chainId || options.chainId == ''){

      throw oThis.getError(`Invalid chainId for ${oThis.constructor.name}`, 'err_es_ced_v_1');
    }

    if(!options.ebsVolumeSize || !Number(options.ebsVolumeSize) || options.ebsVolumeSize < 1){

      throw oThis.getError(`Invalid ebsVolumeSize for ${oThis.constructor.name}`, 'err_es_ced_v_2');
    }

    if(!oThis.constantsObj.esAvalableVolumeTypes().includes(options.ebsVolumeType)){

      throw oThis.getError(`Invalid ebsVolumeType for ${oThis.constructor.name}`, 'err_es_ced_v_3');
    }

    if(![0, 3, 5].includes(options.clusterMasterCount)){

      throw oThis.getError(`Invalid clusterMasterCount for ${oThis.constructor.name}`, 'err_es_ced_v_4');
    }

    if(options.clusterMasterCount > 0 && (!options.clusterMasterType || options.clusterMasterType == '')){

      throw oThis.getError(`Invalid clusterMasterType for ${oThis.constructor.name}`, 'err_es_ced_v_5');
    }

    if(!Number(options.clusterInstanceCount) || options.clusterInstanceCount < 1){

      throw oThis.getError(`Invalid clusterInstanceCount for ${oThis.constructor.name}`, 'err_es_ced_v_6');
    }

    if(!options.clusterInstanceType || options.clusterInstanceType == ''){

      throw oThis.getError(`Invalid clusterInstanceType for ${oThis.constructor.name}`, 'err_es_ced_v_7');
    }

    if(!['1a', '1b'].includes(options.availabilityZone)){

      throw oThis.getError(`Invalid availabilityZone for ${oThis.constructor.name}`, 'err_es_ced_v_8');
    }

  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.chainId
* - options.domainName
* - options.ebsVolumeSize
* - options.ebsVolumeType
* - options.clusterMasterCount
* - options.clusterMasterType
* - options.clusterInstanceCount
* - options.clusterInstanceType
*
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  const constantsObj = oThis.constantsObj
    , constants = constantsObj.getConstants()
    , esConstants = constants.es
    , appConstants = constants[options.app]
  ;

  let params = JSON.parse(JSON.stringify(esConstants.es))
    , domainName = constantsObj.esDomainName({chainId: options.chainId});
  ;
  params.DomainName = options.domainName || domainName;

  let accessPolicy = Object.assign({}, esConstants.accessPolicy);
  accessPolicy.Statement[0].Resource = oThis.constantsObj.esAccessPolicyResourceStr({chainId: options.chainId});
  params.AccessPolicies = JSON.stringify(accessPolicy);

  params.EBSOptions.VolumeSize = options.ebsVolumeSize;
  params.EBSOptions.VolumeType = options.ebsVolumeType;

  if(options.clusterMasterCount > 0){
    params.ElasticsearchClusterConfig.DedicatedMasterEnabled = true;
    params.ElasticsearchClusterConfig.DedicatedMasterCount = options.clusterMasterCount;
    params.ElasticsearchClusterConfig.DedicatedMasterType = options.clusterMasterType;
  } else {
    delete params.ElasticsearchClusterConfig.DedicatedMasterEnabled;
    delete params.ElasticsearchClusterConfig.DedicatedMasterCount;
    delete params.ElasticsearchClusterConfig.DedicatedMasterType;
  }

  params.ElasticsearchClusterConfig.InstanceCount = options.clusterInstanceCount;
  params.ElasticsearchClusterConfig.InstanceType = options.clusterInstanceType;

  params.VPCOptions.SubnetIds.push(appConstants[`SubnetId_${options.availabilityZone}`][options.subEnv].SubnetId);

  // if(false){
  //   return resolve(params);
  // } else {
  //   return reject(oThis.getError('Error while creating instance!', 'temp_err_1'));
  // }

  return oThis._awsServiceRequest('oThis.awsClient.es()', 'createElasticsearchDomain', params);
};

Object.assign(CreateESDomainKlass.prototype, Ec2ServicePrototype);
module.exports = CreateESDomainKlass;
