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
const CreateMemcacheKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

CreateMemcacheKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
CreateMemcacheKlass.prototype.constructor = CreateMemcacheKlass;

const Ec2ServicePrototype = {

  /**
   * Initialize values
   */
  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

    options.cacheType = options.cacheType || 'memcached';
    options.nodeType = options.nodeType || 'cache.t2.micro';
    options.numberOfNodes = options.numberOfNodes || 1;

  },

  /**
   * Create Cache subnet group
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
   * @return {Array<Promise Result>}
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

      throw oThis.getError(`Invalid chainId for ${oThis.constructor.name}`, 'err_elasti_cache_cm_v_2');
    }

    if(!['memcached', 'redis'].includes(options.cacheType)){

      throw oThis.getError(`Invalid cacheType for ${oThis.constructor.name}`, 'err_elasti_cache_cm_v_3');
    }

    if(!options.nodeType || options.nodeType == ''){

      throw oThis.getError(`Invalid nodeType for ${oThis.constructor.name}`, 'err_elasti_cache_cm_v_4');
    }

    if(!options.numberOfNodes || options.numberOfNodes < 0){

      throw oThis.getError(`Invalid numberOfNodes for ${oThis.constructor.name}`, 'err_elasti_cache_cm_v_5');
    }

    if(!options.subnetGroupName || options.subnetGroupName == ''){

      throw oThis.getError(`Invalid numberOfNodes for ${oThis.constructor.name}`, 'err_elasti_cache_cm_v_6');
    }

  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.chainId
* - options.cacheType
* - options.nodeType
* - options.numberOfNodes
* - options.subnetGroupName
*
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  const constantsObj = oThis.constantsObj
    , constants = constantsObj.getConstants()
    , cacheConstants = Object.assign({}, constants.elasticache)
  ;

  let nodeName = constantsObj.getCacheNodeName({cacheType: options.cacheType, chainId: options.chainId});

  let params = Object.assign({}, cacheConstants[options.cacheType]);
  params.CacheClusterId = nodeName;
  params.CacheNodeType = options.nodeType;
  params.CacheSubnetGroupName = options.subnetGroupName;
  params.NumCacheNodes = options.numberOfNodes;

  return oThis._awsServiceRequest('oThis.awsClient.elasticache()', 'createCacheCluster', params);
};

Object.assign(CreateMemcacheKlass.prototype, Ec2ServicePrototype);
module.exports = CreateMemcacheKlass;
