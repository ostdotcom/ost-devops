'use strict';

const crypto = require('crypto')
  , algorithm = 'aes-256-cbc'
;

const LocalCipher = {

  encrypt: function(salt, string) {
    var encrypt = crypto.createCipher(algorithm, salt);
    var encString = encrypt.update(string, 'utf8', 'hex');
    encString += encrypt.final('hex');

    return encString;
  },

  decrypt: function(salt, encryptedString) {
    var decrypt = crypto.createDecipher(algorithm, salt);
    var string = decrypt.update(encryptedString, 'hex', 'utf8');
    string += decrypt.final('utf8');

    return string;
  },

};

module.exports = LocalCipher;
