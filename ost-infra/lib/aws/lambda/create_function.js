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
const CreateLambdaFunctionKlass = function (params) {
  const oThis = this
  ;

  Ec2ServiceBaseKlass.call(oThis, params);

};

CreateLambdaFunctionKlass.prototype = Object.create(Ec2ServiceBaseKlass.prototype);
CreateLambdaFunctionKlass.prototype.constructor = CreateLambdaFunctionKlass;

const Ec2ServicePrototype = {

  /**
   * Initialize values
   */
  init: function (options) {
    const oThis = this
    ;

    Ec2ServiceBaseKlass.prototype.init.call(oThis, options);

    // Set default values
    options.envVariables = options.envVariables || [];

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

    if(!options.chainId || options.chainId == ''){

      throw oThis.getError(`Invalid chainId for ${oThis.constructor.name}`, 'err_lambda_clf_v_1');
    }

    if(!options.codeS3Bucket || options.codeS3Bucket == ''){

      throw oThis.getError(`Invalid codeS3Bucket for ${oThis.constructor.name}`, 'err_lambda_clf_v_2');
    }

    if(!options.codeS3Key || options.codeS3Key == ''){

      throw oThis.getError(`Invalid codeS3Key for ${oThis.constructor.name}`, 'err_lambda_clf_v_3');
    }

    if(!options.executionRole || options.executionRole == ''){

      throw oThis.getError(`Invalid executionRole for ${oThis.constructor.name}`, 'err_lambda_clf_v_4');
    }

    if(!Array.isArray(options.envVariables)){

      throw oThis.getError(`Invalid envVariables for ${oThis.constructor.name}`, 'err_lambda_clf_v_5');
    }
  }
};


// Private Methods

/*
* Params::
* - options.app
* - options.chainId
* - options.codeS3Bucket
* - options.codeS3Key
* - options.functionName
* - options.executionRole
* - options.envVariables
* */

const _performMethod = function (options) {
  const oThis = this
  ;

  const constantsObj = oThis.constantsObj
    , constants = constantsObj.getConstants()
    , lambdaConstants = constants.lambda
    , appConstants = constants[options.app]
  ;

  let params = JSON.parse(JSON.stringify(lambdaConstants.createFunction))
    , funcName = constantsObj.lambdaFuncName({chainId: options.chainId});
  ;

  params.Code.S3Bucket = options.codeS3Bucket;
  params.Code.S3Key = options.codeS3Key;

  params.FunctionName = options.functionName || funcName;

  params.Role = options.executionRole;
  params.Description = `Lambda function for ${options.app} with chain id ${options.chainId}`;

  for(let i=0;i<options.envVariables.length;i++){
    let item = options.envVariables[i];
    params.Environment.Variables[item.key] = item.val;
  }

  params.VpcConfig.SubnetIds.push(appConstants['SubnetId_1a'][options.subEnv].SubnetId);
  params.VpcConfig.SubnetIds.push(appConstants['SubnetId_1b'][options.subEnv].SubnetId);

  return oThis._awsServiceRequest('oThis.awsClient.lambda()', 'createFunction', params);
};

Object.assign(CreateLambdaFunctionKlass.prototype, Ec2ServicePrototype);
module.exports = CreateLambdaFunctionKlass;
