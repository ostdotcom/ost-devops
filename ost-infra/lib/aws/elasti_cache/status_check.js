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
const ElastiCacheStatusCheckKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

ElastiCacheStatusCheckKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
ElastiCacheStatusCheckKlass.prototype.constructor = ElastiCacheStatusCheckKlass;

const Ec2ServicePrototype = {

  /**
   * Initialize values
   */
  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

    options.checkForState = options.checkForState || 'cacheClusterAvailable';
  },

  /**
   * Get cache cluster status
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

    if(!options.clusterId || options.clusterId == ''){

      throw oThis.getError(`Invalid clusterId for ${oThis.constructor.name}`, 'err_elasti_cache_sc_v_1');
    }

    if(options.checkForState != 'cacheClusterAvailable'){

      throw oThis.getError(`Invalid checkForState for ${oThis.constructor.name}`, 'err_elasti_cache_sc_v_2');
    }

  }
};


// Private Methods

/*
* Params::
* - options.clusterId
* - options.checkForState
*
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  let params = {
    CacheClusterId: options.clusterId,
    ShowCacheNodeInfo: true
  };

  return oThis._awsServiceRequest('oThis.awsClient.elasticache()', 'waitFor', params, options.checkForState);
};

Object.assign(ElastiCacheStatusCheckKlass.prototype, Ec2ServicePrototype);
module.exports = ElastiCacheStatusCheckKlass;
