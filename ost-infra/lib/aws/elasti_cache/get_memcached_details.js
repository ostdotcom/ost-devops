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
const GetMemcacheDetailsKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

GetMemcacheDetailsKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
GetMemcacheDetailsKlass.prototype.constructor = GetMemcacheDetailsKlass;

const Ec2ServicePrototype = {

  /**
   * Initialize values
   */
  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

    options.cacheType = options.cacheType || 'memcached';

  },

  /**
   * Get ES Domain details
   *
   * @return {Promise<Result>}
   */
  perform: async function (options) {
    const oThis = this
    ;

    // Get memcached cluster details
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

  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.chainId
* - options.cacheType
* - options.clusterId
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  const constantsObj = oThis.constantsObj;

  let clusterName = constantsObj.getCacheNodeName({cacheType: options.cacheType, chainId: options.chainId})
    , params = {}
  ;
  params.CacheClusterId = options.clusterId || clusterName;
  params.ShowCacheNodeInfo = true;

  return oThis._awsServiceRequest('oThis.awsClient.elasticache()', 'describeCacheClusters', params);
};

Object.assign(GetMemcacheDetailsKlass.prototype, Ec2ServicePrototype);
module.exports = GetMemcacheDetailsKlass;
