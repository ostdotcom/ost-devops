'use strict';

const rootPrefix = '../..'
  , ConstantsKlass = require(rootPrefix + '/config/constants')
  , Constants = new ConstantsKlass()
  , shell = require('shelljs')
  , FileOps = require(rootPrefix + '/lib/file_ops/data_file')
;

// shell.config.silent = true;
shell.config.fatal = true;

const ShellExecutor = function (params) {
  const oThis = this;
  params = params || {};
  oThis.awsAccessKey = params.awsAccessKey;
  oThis.awsSecretKey = params.awsSecretKey;
  oThis.awsRegion = params.awsRegion;
  oThis.awsAccountId = params.awsAccountId;
};

const ShellExecutorPrototype = {

  opensslEncryptFile: function (salt, file) {
    let outFile = `${file}.enc`;
    let cmd = `openssl aes-256-cbc -e -in ${file} -out ${outFile} -pass pass:${salt}`;
    let resp = shell.exec(cmd);
    if(resp.code != 0){
      return false;
    }
    return outFile;
  },

  createAWSCmdProfile: function (profileName) {
    const oThis = this;

    if(!oThis.awsAccessKey || !oThis.awsSecretKey || !oThis.awsRegion || !oThis.awsAccountId){
      throw 'ShellExecutor: Required constructor params are absent!';
    }

    let cmd = `
      aws configure set aws_access_key_id ${oThis.awsAccessKey} --profile ${profileName};
	    aws configure set aws_secret_access_key ${oThis.awsSecretKey} --profile ${profileName};
	    aws configure set region ${oThis.awsRegion} --profile ${profileName};
	    aws configure set output json --profile ${profileName};
	    aws configure set s3.signature_version s3v4 --profile ${profileName};
    `;

    let resp = shell.exec(cmd);
    if(resp.code != 0){
      return false;
    }
    return true;
  },

  uploadFileToS3: function (awsProfile, srcFile, destFile, kmsKeyId) {
    const oThis = this;

    // Set AWS Profile for command line operation
    let resp = oThis.createAWSCmdProfile(awsProfile);
    if(!resp){
      return false;
    }

    let cmd = `aws s3 cp --sse "aws:kms" --sse-kms-key-id ${kmsKeyId} ${srcFile} ${destFile} --profile ${awsProfile}`;
    let uploadResp = shell.exec(cmd);
    if(uploadResp.code != 0){
      return false;
    }

    return true;
  },

  execCmd: function (path, cmd, options) {
    const oThis = this;

    // Copy group vars to infra workspace before executing ansible play
    if(options && options.stack && options.env){
      console.log("***** Copy inventory files to infra workspace *****");
      let fileOpsObj = new FileOps();
      let sourceGroupVars = `${Constants.devOpsRoot()}/ansible/inventories/${options.env}/group_vars`;
      let destGroupVars = Constants.ansibleGroupVarsDirPath(options.stack, options.env);
      let groupVarsDir = fileOpsObj.copyDir(sourceGroupVars,destGroupVars);
      if(!groupVarsDir){
        throw oThis.getError(`Error generating group vars`);
      }
    }

    try {
      shell.cd(path);

      console.log("cmd: ", cmd);
      let execResp = shell.exec(cmd);

      if(execResp.code != 0){
        return false;
      }

      return true;
    } catch (err) {
      return false;
    }

  },

  getExtraVarsData: function (extraVars) {
    let extraVarsData = '';

    for(let key in extraVars){
      let val = extraVars[key];
      extraVarsData += `${key}=${val} `;
    }

    return extraVarsData;
  },

  runAnsibleAppSetup: function (inventoryFile, extraVars, ips) {
    const oThis = this;

    extraVars['local_user'] = oThis.getLocalUser();
    extraVars['remoteUser'] = Constants.getRemoteUser(extraVars['application']);
    let scriptPath = `${Constants.devOpsRoot()}/ansible`
      , extraVarsData = oThis.getExtraVarsData(extraVars)
      , cmd = `env ansible-playbook -i ${inventoryFile} plays/setup.yml --extra-vars "${extraVarsData}"`
    ;

    if(ips){
      cmd = `${cmd} --limit ${ips}`;
    }

    return oThis.execCmd(scriptPath, cmd);
  },

  runBuild: function (app, branchName, buildNumber, s3BuildPath, awsProfile,env,githubRepo) {
    const oThis = this;

    // Set AWS Profile for command line operation
    let resp = oThis.createAWSCmdProfile(awsProfile);
    if(!resp){
      return false;
    }

    let scriptPath = `${Constants.devOpsRoot()}/ansible/build`
      , cmd = `./build.sh -a ${app} -n ${buildNumber} -b ${branchName} -u ${s3BuildPath} -p ${awsProfile} -e ${env} -g ${githubRepo}`
    ;

    return oThis.execCmd(scriptPath, cmd);
  },

  deployStaticFiles: function (env, app, branchName, buildFilesPath, s3FullPath, awsProfile) {
    const oThis = this;

    // Set AWS Profile for command line operation
    let resp = oThis.createAWSCmdProfile(awsProfile);
    if(!resp){
      return false;
    }

    let scriptPath = `${Constants.devOpsRoot()}/ansible/build`
      , cmd = `./deploy_static_files.sh --env ${env} --application ${app} --branch-name ${branchName} --build-files-path ${buildFilesPath} --s3-path ${s3FullPath} --aws-profile ${awsProfile}`
    ;

    return oThis.execCmd(scriptPath, cmd);
  },

  updateLambdaCode: function (app, branchName, buildNumber, s3Bucket, awsProfile, functionArn, packageFile) {
    const oThis = this;

    // Set AWS Profile for command line operation
    let resp = oThis.createAWSCmdProfile(awsProfile);
    if(!resp){
      return false;
    }

    let scriptPath = `${Constants.devOpsRoot()}/ansible/build`
      , cmd = `./lambda_update_code.sh --app ${app} --branch-name ${branchName} --build-no ${buildNumber} --aws-profile ${awsProfile} --function-arn ${functionArn} --s3-bucket ${s3Bucket} --package-file ${packageFile}`
    ;

    return oThis.execCmd(scriptPath, cmd);
  },

  runDeploy: function (inventoryFile,extraVars, ips) {
    const oThis = this;
    extraVars['remoteUser']=Constants.getRemoteUser(extraVars['application']);
    let scriptPath = `${Constants.devOpsRoot()}/ansible`
      , extraVarsData = oThis.getExtraVarsData(extraVars)
      , cmd = `env ansible-playbook -i ${inventoryFile} plays/deploy.yml --extra-vars "${extraVarsData}"`
    ;

    if(ips){
      cmd = `${cmd} --limit ${ips}`;
    }

   return oThis.execCmd(scriptPath, cmd);

  },

  runRestart: function (inventoryFile,extraVars, ips) {
    const oThis = this;
    extraVars['remoteUser']=Constants.getRemoteUser(extraVars['application']);

    let scriptPath = `${Constants.devOpsRoot()}/ansible`
      , extraVarsData = oThis.getExtraVarsData(extraVars)
      , cmd = `env ansible-playbook -i ${inventoryFile} plays/restart.yml --extra-vars "${extraVarsData}"`
    ;

    if(ips){
      cmd = `${cmd} --limit ${ips}`;
    }

    return oThis.execCmd(scriptPath, cmd);
  },

  runAppTasks: function (inventoryFile, extraVars, options) {
    const oThis = this;
    extraVars['remoteUser']=Constants.getRemoteUser(extraVars['application']);
    let scriptPath = `${Constants.devOpsRoot()}/ansible`
      , extraVarsData = oThis.getExtraVarsData(extraVars)
      , cmd = `env ansible-playbook -i ${inventoryFile} plays/remote_services.yml --extra-vars "${extraVarsData}"`
    ;

    if(typeof(options.ips) === 'string'){
      cmd = `${cmd} --limit ${options.ips}`;
    } else if(Array.isArray(options.ips)){
      cmd = `${cmd} --limit ${options.ips.join(',')}`;
    }

    return oThis.execCmd(scriptPath, cmd, {stack: options.stack, env: options.env});
  },

 /**
  * Deploy runPlaybook
  * @param {string} inventoryFile - Ansible inventory file path
  * @param {object} extraVars - Ansible extra vars data
  * @param {object} options - Optional parameter map
  * @param {string} options.playbookName - Ansible playbook name
  * @param {string} options.stack - Ansible execution platform identifier
  * @param {string} options.env - Ansible execution environment
  * @param {string} options.ips - Comma seperated ips where  the changes are to be applied
 */
  runOnetimer: function (inventoryFile, extraVars, options) {
    const oThis = this;
    let scriptPath = `${Constants.devOpsRoot()}/ansible`
      , extraVarsData = oThis.getExtraVarsData(extraVars)
      , cmd = `env ansible-playbook -i ${inventoryFile} plays/onetimer.yml --extra-vars "${extraVarsData}"`
    ;
   let fileOpsObj = new FileOps();
   let sourceGroupVars= `${Constants.devOpsRoot()}/ansible/inventories/${options.env}/group_vars`;
   let destGroupVars=Constants.ansibleGroupVarsDirPath(options.stack, options.env);
   let groupVarsDir=fileOpsObj.copyDir(sourceGroupVars,destGroupVars);
   if(!groupVarsDir){
     throw oThis.getError(`Error generating group vars`);
   }
    if(typeof(options.ips) === 'string'){
      cmd = `${cmd} --limit ${options.ips}`;
    } else if(Array.isArray(options.ips)){
      cmd = `${cmd} --limit ${options.ips.join(',')}`;
    }

    return oThis.execCmd(scriptPath, cmd, {stack: options.stack, env: options.env});
  },

  runNagiostasks: function (inventoryFile, extraVars, ips) {
    const oThis = this;

    let scriptPath = `${Constants.devOpsRoot()}/ansible`
      , extraVarsData = oThis.getExtraVarsData(extraVars)
      , cmd = `env ansible-playbook -i ${inventoryFile} plays/monitoring.yml --extra-vars "${extraVarsData}"`
    ;

    if(ips){
      cmd = `${cmd} --limit ${ips}`;
    }

    return oThis.execCmd(scriptPath, cmd);
  },

  getLocalUser:function (){
    const oThis = this;
    return shell.exec('whoami').stdout.trim();
  },

  runUtilityTask: function (inventoryFile, extraVars, ips) {
    const oThis = this;

    extraVars['local_user'] = oThis.getLocalUser();

    let scriptPath = `${Constants.devOpsRoot()}/ansible`
      , extraVarsData = oThis.getExtraVarsData(extraVars)
      , cmd = `env ansible-playbook -i ${inventoryFile} plays/utility_setup.yml --extra-vars "${extraVarsData}"`
    ;

    if(ips){
      cmd = `${cmd} --limit ${ips}`;
    }

    return oThis.execCmd(scriptPath, cmd);
  },

  runValueTask: function (inventoryFile, extraVars, ips) {
  const oThis = this;


  let scriptPath = `${Constants.devOpsRoot()}/ansible`
    , extraVarsData = oThis.getExtraVarsData(extraVars)
    , cmd = `env ansible-playbook -i ${inventoryFile} plays/value_setup.yml --extra-vars "${extraVarsData}"`
  ;

  if(ips){
    cmd = `${cmd} --limit ${ips}`;
  }
  return oThis.execCmd(scriptPath, cmd);
},
};

Object.assign(ShellExecutor.prototype, ShellExecutorPrototype);
module.exports = ShellExecutor;

