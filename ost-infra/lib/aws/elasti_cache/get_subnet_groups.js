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
const GetSubnetGroupsKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

GetSubnetGroupsKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
GetSubnetGroupsKlass.prototype.constructor = GetSubnetGroupsKlass;

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
   * Get cache subnet groups
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

      throw oThis.getError(`Invalid chainId for ${oThis.constructor.name}`, 'err_elasti_cache_gsg_v_2');
    }

    if(!['memcached', 'redis'].includes(options.cacheType)){

      throw oThis.getError(`Invalid cacheType for ${oThis.constructor.name}`, 'err_elasti_cache_gsg_v_3');
    }

  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.chainId
* - options.cacheType
*
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  const constantsObj = oThis.constantsObj
  ;
  // let groupName = `${options.app}-${oThis.env}-${oThis.subEnv}-${options.cacheType}-${options.chainId}`;
  let groupName = constantsObj.getCacheSubnetGroupName({cacheType: options.cacheType});
  let params = {
    CacheSubnetGroupName: groupName
  };

  return oThis._awsServiceRequest('oThis.awsClient.elasticache()', 'describeCacheSubnetGroups', params);
};

Object.assign(GetSubnetGroupsKlass.prototype, Ec2ServicePrototype);
module.exports = GetSubnetGroupsKlass;
