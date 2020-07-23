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
const InvokeLambdaFunctionKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

InvokeLambdaFunctionKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
InvokeLambdaFunctionKlass.prototype.constructor = InvokeLambdaFunctionKlass;

const Ec2ServicePrototype = {

  /**
   * Initialize values
   * @param {object} options - Param object
   * @param {string} options.app - Application identifier
   * @param {string} options.functionName - Lambda function name
   * @param {string} options.payload - Lambda function payload
   * @param {string} options.invokeType - function call type (invoke/invokeAsync)
   */
  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

    options.payload = options.payload || {};

  },

  /**
   * Create Lambda function
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

    if(!options.functionName || options.functionName === ''){

      throw oThis.getError(`Invalid method invokeType for ${oThis.constructor.name}`, 'err_lambda_ilf_v_1');
    }

    if(!['invoke', 'invokeAsync'].includes(options.invokeType)){

      throw oThis.getError(`Invalid method invokeType for ${oThis.constructor.name}`, 'err_lambda_ilf_v_2');
    }

  }
};


// Private Methods

const _performMethod = function (options) {
  const oThis = this
  ;

  let params = {
    FunctionName: options.functionName
  };

  if(options.invokeType === 'invoke'){
    params['Payload'] = options.payload;
  } else if(options.invokeType === 'invokeAsync'){
    params['InvokeArgs'] = options.payload;
  }

  return oThis._awsServiceRequest('oThis.awsClient.lambda()', options.invokeType, params);
};

Object.assign(InvokeLambdaFunctionKlass.prototype, Ec2ServicePrototype);
module.exports = InvokeLambdaFunctionKlass;
