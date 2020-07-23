"use strict";

const rootPrefix = '../../..'
  , Ec2ServiceBaseKlass = require(rootPrefix + '/lib/aws/base')
;

/**
 * Class for terminating ec2
 *
 * @class Ec2ServiceTerminateKlass
 */
class Ec2ServiceTerminateKlass extends Ec2ServiceBaseKlass {
  /**
   * Constructor for Ec2ServiceTerminateKlass .
   *
   * @augments Ec2ServiceBaseKlass
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this ;

  }
  /**
   * validate passed parameters
   */
  validate(options){
    const oThis = this ;
    super.validate(options);
    if(!options.instanceIds || Array.isArray(options.instanceIds) === false){
      throw oThis.getError(`Invalid instanceIds for ${oThis.constructor.name}`, 'err_ec2_si_v_1');
    }

  }
  /**
   * perform
   */
  async perform(options){
    const oThis = this ;
    return super.perform(options);

  }
  /**
   * asyncPerform
   */
  asyncPerform(options){
    const oThis = this ;
    var params = {
      InstanceIds: options.instanceIds
    };
    return oThis._awsServiceRequest('oThis.awsClient.ec2()', 'terminateInstances', params);
  }

}
module.exports = Ec2ServiceTerminateKlass;
