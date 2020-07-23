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
const Ec2ServiceGetSnapshotsByTagKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

Ec2ServiceGetSnapshotsByTagKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
Ec2ServiceGetSnapshotsByTagKlass.prototype.constructor = Ec2ServiceGetSnapshotsByTagKlass;

const Ec2ServicePrototype = {

  /**
   * Initialize values
   */
  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

    options.status = options.status || 'completed';

  },

  /**
   * Get Snapshots by tags
   *
   * @return {Promise<Result>}
   */
  perform: async function (options) {
    const oThis = this
    ;

    return Ec2ServiceBaseKlass.prototype.perform.call(oThis, options);
  },

  /**
   * Perform EC2 instance operation
   *
   * @return {Promise<Result>}
   */
  asyncPerform: function(options) {
    const oThis = this
    ;

    return getSnapshotsByTag.call(oThis, options);
  },

  /**
   * validate passed parameters
   */
  validate: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.validate.call(oThis, options);

    if(options.tags && typeof(options.tags) !== 'object'){
      throw oThis.getError(`Invalid tags for ${oThis.constructor.name}`, 'err_ec2_gsbt_v1');
    }

  }
};

// Private Methods

const getTagsFromParams = function (ec2Params, options) {
  const oThis = this
  ;

  let tagDict = {};
  tagDict[ec2Params.envTag.Key] = oThis.env;
  tagDict[ec2Params.subEnvTag.Key] = oThis.subEnv;
  tagDict[ec2Params.appNameTag.Key] = options.app;
  if(options.group && options.group.length > 0){
    tagDict[ec2Params.groupTag.Key] = options.group;
  }

  if(options.tags){
    tagDict = Object.assign(tagDict, options.tags);
  }

  return tagDict;

};

/**
 * Params:
 * - options.tags (optional)
 * - options.status (optional)
 * - options.group (optional)
 * - options.maxResults (optional)
 */

var getSnapshotsByTag = function (options) {
  const oThis = this
  ;

  let constantsObj = oThis.constantsObj
    , constants = oThis.utils.clone(constantsObj.getConstants())
    , ec2Params = Object.assign({}, constants.ec2)
  ;

  let tagsData = getTagsFromParams.call(oThis, ec2Params, options);

  let filters = [];
  for(let key in tagsData){
    let val = tagsData[key];
    filters.push({Name: `tag:${key}`, Values: [val]});
  }

  filters.push({Name: 'status', Values: [options.status]});

  let apiParams = {
    Filters: filters,
    MaxResults: options.maxResults || 10
  };

  return oThis._awsServiceRequest('oThis.awsClient.ec2()', 'describeSnapshots', apiParams);

};

Object.assign(Ec2ServiceGetSnapshotsByTagKlass.prototype, Ec2ServicePrototype);
module.exports = Ec2ServiceGetSnapshotsByTagKlass;
