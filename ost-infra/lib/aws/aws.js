"use strict";

module.exports = (function(){
  const rootPrefix = '../..'
    , AWS = require('aws-sdk');

  const AWSApiClass = function (params) {
    const oThis = this
    ;

    oThis.awsAccessKey = params.awsAccessKey;
    oThis.awsSecretKey = params.awsSecretKey;
    oThis.awsRegion = params.awsRegion;
  };

  AWSApiClass.prototype = {

    // Ec2 Module
    ec2: function (options) {
      const  oThis = this
      ;

      return new AWS.EC2(Object.assign({apiVersion: '2016-11-15'}, _getCredentials.call(oThis)));
    },

    // ElastiCache Module
    elasticache: function (options) {
      const  oThis = this
      ;

      return new AWS.ElastiCache(Object.assign({apiVersion: '2015-02-02'}, _getCredentials.call(oThis)));
    },

    // ES Module
    es: function (options) {
      const  oThis = this
      ;

      return new AWS.ES(Object.assign({apiVersion: '2015-01-01'}, _getCredentials.call(oThis)));
    },

    // Lambda Module
    lambda: function (options) {
      const  oThis = this
      ;

      return new AWS.Lambda(Object.assign({apiVersion: '2015-03-31'}, _getCredentials.call(oThis)));
    },

    // Lambda Module
    iam: function (options) {
      const  oThis = this
      ;

      return new AWS.IAM(Object.assign({apiVersion: '2010-05-08'}, _getCredentials.call(oThis)));
    },

    // KMS Module
    kms: function (options) {
      const  oThis = this
      ;

      return new AWS.KMS(Object.assign({apiVersion: '2014-11-01'}, _getCredentials.call(oThis)));
    },

    // S3 Module
    s3: function (options) {
      const  oThis = this
      ;

      return new AWS.S3(Object.assign({apiVersion: '2006-03-01'}, _getCredentials.call(oThis)));
    },

  };

  const _getCredentials = function () {
    const oThis = this
    ;

    return {
      accessKeyId: oThis.awsAccessKey,
      secretAccessKey: oThis.awsSecretKey,
      region: oThis.awsRegion
    };
  };

  return AWSApiClass;

})();





// const rootPrefix = '../..'
//   , AWS = require('aws-sdk');
//
// const AWSApiClass = function (params) {
//   const oThis = this
//   ;
//
//   oThis.awsAccessKey = params.awsAccessKey;
//   oThis.awsSecretKey = params.awsSecretKey;
//   oThis.awsRegion = params.awsRegion;
// };
//
// AWSApiClass.prototype = {
//
//   // Ec2 Object
//   ec2: function (options) {
//     const  oThis = this
//     ;
//
//     return new AWS.EC2(Object.assign({apiVersion: '2016-11-15'}, _getCredentials.call(oThis)));
//   },
//
//   // ElastiCache Object
//   elasticache: function (options) {
//     const  oThis = this
//     ;
//
//     return new AWS.ElastiCache(Object.assign({apiVersion: '2015-02-02'}, _getCredentials.call(oThis)));
//   },
//
//   // ES Object
//   es: function (options) {
//     const  oThis = this
//     ;
//
//     return new AWS.ES(Object.assign({apiVersion: '2015-01-01'}, _getCredentials.call(oThis)));
//   },
//
//   // Lambda Object
//   lambda: function (options) {
//     const  oThis = this
//     ;
//
//     return null;
//   },
//
// };
//
// const _getCredentials = function () {
//   const oThis = this
//   ;
//
//   return {
//     accessKeyId: oThis.awsAccessKey,
//     secretAccessKey: oThis.awsSecretKey,
//     region: oThis.awsRegion
//   };
// };
//
// const ApiClass = function(){};
// ApiClass.prototype = {
//   getClient: function (options) {
//     return new AWSApiClass(options);
//   }
// };
//
// module.exports = AWSApiClass;
// // module.exports = ApiClass;
