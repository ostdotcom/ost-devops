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
const GetESDomainDetailsKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

GetESDomainDetailsKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
GetESDomainDetailsKlass.prototype.constructor = GetESDomainDetailsKlass;

const Ec2ServicePrototype = {

  /**
   * Initialize values
   */
  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

  },

  /**
   * Get ES Domain details
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

    if(!options.chainId && !options.domainName){

      throw oThis.getError(`Invalid chainId|domainName for ${oThis.constructor.name}`, 'err_es_gedd_v_1');
    }

  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.chainId
* - options.domainName
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  const constantsObj = oThis.constantsObj;

  let domainName = constantsObj.esDomainName({chainId: options.chainId})
    , params = {}
  ;
  params.DomainName = options.domainName || domainName;

  return oThis._awsServiceRequest('oThis.awsClient.es()', 'describeElasticsearchDomain', params);
};

Object.assign(GetESDomainDetailsKlass.prototype, Ec2ServicePrototype);
module.exports = GetESDomainDetailsKlass;
