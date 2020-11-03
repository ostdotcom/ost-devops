'use strict';

const rootPrefix = '../..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , Constants = new ConstantsKlass()
  , fs = require('fs')
  , shell = require('shelljs')
  , yaml = require('js-yaml')
;


const DataFileKlass = function(params) {
  const oThis = this;

  params = params || {};
};

DataFileKlass.prototype = {

  read: function(file){

    try {
      var data = fs.readFileSync(file, 'utf8');
      return data;
    } catch(e) {
      console.log('Error read file :', e.stack);
      return false;
    }

  },

  _create: function (file, data) {
    return new Promise(function (resolve, reject) {

      fs.writeFile(file, data, function (err){

        if(err){
          console.error("writeFile error: ", err);
          return reject(false);
        }

        console.log("file: ", file);

        return resolve(file);
      });

    });
  },

  create: function (fileName, data, fileType) {
    const  oThis = this;

    if(fileName.endsWith('.json')){
      fileName = fileName.split('.json')[0];
    }

    fileType = fileType || 'json';
    let _file = oThis.getFileFullPath(fileName, fileType);

    let fileData = oThis.getDataForFileType(data, fileType);

    return oThis._create(_file, fileData);

  },

  _remove: function (_file) {
    const  oThis = this;

    return new Promise(function (resolve, reject) {

      let resp = shell.exec(`stat ${_file}`);
      if(resp.code !== 0){
        return resolve(true);
      }

      resp = shell.exec(`rm -f ${_file}`);
      if(resp.code === 0){
        return resolve(true);
      } else {
        return reject(false);
      }

    });

  },

  remove: function (fileName, fileType) {
    const  oThis = this;

    fileType = fileType || 'json';
    let _file = oThis.getFileFullPath(fileName, fileType);

    return oThis._remove(_file);

  },

  removeFile: function (file) {
    const  oThis = this;

    return oThis._remove(file);

  },

  open: function (fileName, fileType) {
    const  oThis = this;

    fileType = fileType || 'json';
    let _file = oThis.getFileFullPath(fileName, fileType);
    let resp = shell.exec(`open ${_file}`);

    // If Error in executing command
    if(resp.code != 0){
      // Remove created file
      oThis.remove(fileName, fileType);
      return false;
    }

    return true;
  },

  loadFile: function (fileName, fileType) {
    const  oThis = this;

    fileType = fileType || 'json';
    let _file = oThis.getFileFullPath(fileName, fileType);

    try {
      let resp = require(_file);
      return resp;
    } catch (err) {
      console.error('Data file load error: ', err);
      return false;
    }

  },

  getFileFullPath: function (fileName, fileType) {
    return `${Constants.infraWorkspacePath()}/${fileName}.${fileType}`
  },
  
  createFileForPath: async function (filePath, fileName, fileType, data) {
    const  oThis = this;

    let file = `${filePath}/${fileName}`;
    if(fileType && fileType != ''){
      file = `${file}.${fileType}`
    }

    oThis.createDir(filePath);
    let fileData = oThis.getDataForFileType(data, fileType);

    let resp = await oThis._create(file, fileData);

    return resp;
  },

  getDataForFileType: function (data, fileType) {

    let fileData = data;
    if(fileType === 'json'){
      fileData = JSON.stringify(data, null, 4)
    }

    return fileData;
  },
  
  createDir: function (filePath) {
    let resp = shell.exec(`mkdir -p ${filePath}`);

    // If Error in executing command
    if(resp.code != 0){
      return false;
    }
    return true;
  },
  removeDir: function (filePath) {
    let resp = shell.exec(`rm -rf  ${filePath}`);

    // If Error in executing command
    if(resp.code != 0){
      return false;
    }
    return true;
  },

  copyDir: function (source,destination) {
    let resp = shell.exec(`cp -r ${source} ${destination}`);

    // If Error in executing command
    if(resp.code != 0){
      return false;
    }
    return true;
  },
  
  jsonToYaml: function (jsonData) {
    let resp = yaml.safeDump(jsonData, {
      'styles': {
        '!!null': 'canonical' // dump null as ~
      },
      'sortKeys': true        // sort object keys
    });

    return resp;
  },
  generateAppSpecificSetupFiles: async function (filesData,location) {
    const oThis = this
    ;

    let localFilePaths = {};
    for(let i=0;i<filesData.length;i++){
      let fileData = filesData[i];
      let file = await oThis.createFileForPath(location , fileData['fileName'], '', fileData['data']);
      localFilePaths[fileData['varName']] = file;
    }

    return localFilePaths;
  },

  removeLocalFiles: async function (files) {
    const oThis = this;
    for(let i=0;i<files.length;i++){
      let file = files[i];
      await oThis.removeFile(file);
    }

    return true;
  }

};

module.exports = DataFileKlass;
