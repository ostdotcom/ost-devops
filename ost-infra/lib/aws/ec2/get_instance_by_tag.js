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
const Ec2ServiceGetByTagKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

Ec2ServiceGetByTagKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
Ec2ServiceGetByTagKlass.prototype.constructor = Ec2ServiceGetByTagKlass;

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
   * Perform EC2 instance operation
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

    return getInstanceByTag.call(oThis, options);
  },

  /**
   * validate passed parameters
   */
  validate: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.validate.call(oThis,options);

    if(!options.tags || Array.isArray(options.tags) === false){
      throw oThis.getError(`Invalid tags for ${oThis.constructor.name}`, 'err_ec2_gibt_v_1');
    }

  }
};


// Private Methods

/**
 * Params:
 * - options.tags
 */

var getInstanceByTag = function (options) {
  const oThis = this
  ;

  return new Promise(function (resolve, reject) {

    var params = {}
      , filters = []
    ;
    for(var i=0;i<options.tags.length;i++){
      let item = options.tags[i];
      filters.push({Name: `tag:${item.key}`, Values: [item.val]});
    }
    params['Filters'] = filters;

    oThis.awsClient.ec2().describeInstances(params, function (err, data) {
      if (err) {
        console.log(err, err.stack);
        return reject(oThis.getError(`stopInstance: ${err.message}`, 'err_ec2_si_rej_1'));
      } else {
        return resolve(data);
      }
    });
  });

};

Object.assign(Ec2ServiceGetByTagKlass.prototype, Ec2ServicePrototype);
module.exports = Ec2ServiceGetByTagKlass;
