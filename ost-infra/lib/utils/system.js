'use strict';

const DNS = require('dns')
  , OS = require('os')
;

const SystemUtil = function() {};

SystemUtil.prototype = {
  constructor: SystemUtil,

  getIPAddress: async function() {
    return new Promise(function (resolve, reject) {
      DNS.lookup(OS.hostname(), function (err, add, fam) {
        if(err){
          resolve('127.0.0.1');
        } else {
          resolve(add);
        }
      })
    });
  }

};

module.exports = new SystemUtil();
