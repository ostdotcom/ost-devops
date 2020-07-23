'use strict';

const rootPrefix = '..'
  , MysqlQueryKlass = require(rootPrefix + '/lib/query_builders/mysql')
  , mysqlWrapper = require(rootPrefix + '/lib/mysql_wrapper')
  , LocalEncrypt = require(rootPrefix + '/lib/utils/local_cipher')
;

const ModelBaseKlass = function(params) {
  const oThis = this;

  let dbName = getDbName(params.dbName);
  console.log("dbName: ", dbName);
  oThis.dbName = dbName;
  MysqlQueryKlass.call(this);

  oThis.localCipher = LocalEncrypt;

  function getDbName(dbName) {
    let _dbName
      , appEnv = process.env['APP_ENV']
    ;

    if(dbName){
      _dbName = dbName;
    } else{
      _dbName = 'infra_' + `${appEnv}`;
    }
    return _dbName;
  }
};

ModelBaseKlass.prototype = Object.create(MysqlQueryKlass.prototype);

const ModelBaseKlassPrototype = {

  // get read connection
  onReadPool: function() {
    return mysqlWrapper.getPoolFor(this.dbName, 'master');
  },

  // on write connection
  onWritePool: function() {
    return mysqlWrapper.getPoolFor(this.dbName, 'master');
  },

  convertEnumForDB: function(params, readable) {
    const oThis = this,
      enumKeys = Object.keys(oThis.enums);

    for (var i = 0; i < enumKeys.length; i++) {
      var enum_k = enumKeys[i];

      if (params[enum_k]) {
        params[enum_k] = readable
          ? oThis.enums[enum_k]['val'][params[enum_k]]
          : oThis.enums[enum_k]['inverted'][params[enum_k]];
      }
    }
    return params;
  },

  convertEnumForResult: function(params) {
    return this.convertEnumForDB(params, true);
  },

  fire: function() {
    const oThis = this;

    return new Promise(function(onResolve, onReject) {
      const queryGenerator = oThis.generate();
      // if (queryGenerator.isSuccess()) {
      //   console.log("\nqueryGenerator.data.query: %s\nqueryGenerator.data.queryData: %s", queryGenerator.data.query, queryGenerator.data.queryData);
      // }

      var pre_query = Date.now();
      var qry = oThis
        .onWritePool()
        .query(queryGenerator.data.query, queryGenerator.data.queryData, function(err, result, fields) {
          console.log('(' + (Date.now() - pre_query) + ' ms)', qry.sql);
          if (err) {
            onReject(err);
          } else {
            onResolve(result);
          }
        });
    });
  },

  // fire: function() {
  //   const oThis = this;
  //
  //   return new Promise(function(resolve, reject) {
  //     const queryGenerator = oThis.generate();
  //     // if (queryGenerator.isSuccess()) {
  //     //   console.log("\nqueryGenerator.data.query: %s\nqueryGenerator.data.queryData: %s", queryGenerator.data.query, queryGenerator.data.queryData);
  //     // }
  //
  //     oThis
  //       .onWritePool()
  //       .getConnection(function (err, connection) {
  //         if(err){
  //           console.error(err);
  //           throw err;
  //         }
  //
  //         connection.query(queryGenerator.data.query, queryGenerator.data.queryData, function(err, result, fields){
  //           connection.release();
  //           if (err) {
  //             console.error(err);
  //             throw err;
  //           } else {
  //             console.log("result: ", result);
  //             return resolve(result);
  //           }
  //         });
  //
  //       })
  //     ;
  //   });
  // },

  /**
   * Get details by Id.
   *
   * @param id
   * @returns {*}
   *
   */
  getById: function(id) {
    const oThis = this;

    return oThis
      .select('*')
      .where({ id: id })
      .fire();
  },

  /**
   * Get details for multiple ids.
   *
   * @param ids
   * @returns {*}
   *
   */
  getByIds: function(ids) {
    const oThis = this;

    return oThis
      .select('*')
      .where(['id IN (?)', ids])
      .fire();
  },

  getError: function (message, code) {
    const oThis = this
    ;

    var err = new Error();
    err.code = code || 'err_undefined';
    err.name = `${oThis.constructor.name}Error`;
    err.message = message;

    return err;
  },
};

Object.assign(ModelBaseKlass.prototype, ModelBaseKlassPrototype);

module.exports = ModelBaseKlass;
