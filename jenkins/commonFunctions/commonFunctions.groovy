/*
 * Common utility methods
 */

def initJob(envVars){

	lib_dir = envVars.WORKSPACE;
	if(envVars.WORKSPACE_LIB != null){
		lib_dir = envVars.WORKSPACE_LIB;
	}

    sh """#!/usr/bin/env bash

	echo "Running basic setup required to run task!"

    source ~/.profile
    cd "${lib_dir}@script/ost-infra"
    npm install;

	"""
}

def getOutFileForTask(task, envVars){
	if(['build', 'create-ec2', 'ec2-details'].contains(task)){
		return "${envVars.JOB_NAME}-${envVars.BUILD_ID}-${task}.json";
	} else {
		throw new Exception("getOutFileForTask:: Invalid task name: ${task}!");
	}
}

def getOutputForTask(task, envVars){
	file = this.getOutFileForTask(task, envVars);
	def out_data = readJSON file: file;
	return out_data;
}

def getAppListForGroup(group){
	app_list = []
	if(group == 'ost-saas'){
		app_list = app_list.plus(['saasApi', 'rabbitSaasApi', 'utility'])
	} else if(group == 'ost-platform'){
		app_list = app_list.plus(['api', 'ostView', 'ostAnalytics'])
		app_list = app_list.plus(this.getAppListForGroup('ost-platform'))
	}  else if(group == 'ost-other'){
		app_list = app_list.plus(['ostWeb', 'cmsApi', 'mappyApi'])
	}  else if(group == 'ost-org'){
		app_list = app_list.plus(['ostOrg'])
	}  else if(group == 'ost-value'){
		app_list = app_list.plus(['value'])
	}
	return app_list;
}


/*
 * Service specific methods
 */

def updateEc2InstanceData(envVars){

	String command = "./app_setup.js --update-app-status --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION}"
	if(envVars.CHAIN_ID != null && envVars.CHAIN_ID.length() > 0){
		command = "${command} --chain-id ${envVars.CHAIN_ID}"
	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def awsCreateAppStack(envVars){

	String result_out_file = this.getOutFileForTask('create-ec2', envVars);

	String command = "./app_setup.js --create-app-stack --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION} --ec2-status instanceStatusOk --response-out-file ${result_out_file}"
	if(envVars.CHAIN_ID != null && envVars.CHAIN_ID.length() > 0){
		command = "${command} --chain-id ${envVars.CHAIN_ID}"
	}

	if(envVars.EXCLUDE_CRON_JOBS == "true"){
		command = "${command} --exclude-jobs"
	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def awsCreateAppServer(envVars){

	String result_out_file = this.getOutFileForTask('create-ec2', envVars);

	String command = "./app_setup.js --create-server-app --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION} --ec2-status instanceStatusOk --app-name '${envVars.APP_NAME}' --app-type ${envVars.APP_TYPE} --app-count ${envVars.APP_COUNT} --instance-type ${envVars.INSTANCE_TYPE} --volume-size ${envVars.VOLUME_SIZE} --response-out-file ${result_out_file}"

	if(envVars.CHAIN_ID.length() > 0){
		command = "${command} --chain-id ${envVars.CHAIN_ID}"
	}

	if(envVars.APP_DATA.length() > 0){
		command = "${command} --app-data '${envVars.APP_DATA}'"
	}

	if(envVars.COPY_APP_DATA_FROM_IP.length() > 0){
		command = "${command} --copy-app-data-from-ip '${envVars.COPY_APP_DATA_FROM_IP}'"
	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def stopApp(envVars){

	String command = "./app_setup.js --stop-app --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION}"
	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def startApp(envVars){

	String command = "./app_setup.js --start-app --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION}"
	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def appSetup(envVars){

	command = "./ansible.js --app-setup --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV}"
	if(envVars.CHAIN_ID != null && envVars.CHAIN_ID.length() > 0){
		command = "${command} --chain-id ${envVars.CHAIN_ID}"
	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell("${command} --app ${envVars.APPLICATION}", envVars, dryRun);

}

// Add cron job entries in DB for application
def addCronJobEntries(envVars){

	command = "./ansible.js --add-cron-jobs --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION}"
	if(envVars.CRON_JOBS != null && envVars.CRON_JOBS.length() > 0){
		command = "${command} --cron-jobs ${envVars.CRON_JOBS}"
	}

	if(envVars.RPM_VERSION != null && envVars.RPM_VERSION.length() > 0){
		command = "${command} --build-number ${envVars.RPM_VERSION}"
	}

	if(envVars.ip_addresses != null && envVars.ip_addresses.length() > 0){
  		command = "${command} --ip-addresses ${envVars.ip_addresses}"
  	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);

}

// Activate systemd services and restart
def activateServices(envVars){

	command = "./ansible.js --activate-services --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION}"
	if(envVars.CHAIN_ID != null && envVars.CHAIN_ID.length() > 0){
		command = "${command} --chain-id ${envVars.CHAIN_ID}"
	}

	if(envVars.IP_ADDRESSES != null && envVars.IP_ADDRESSES.length() > 0){
		command = "${command} --ip-addresses ${envVars.ip_addresses}"
	}

	if(envVars.RESTART == 'true'){
		command = "${command} --service-action restart --force"
	}

	if(envVars.COPY_JOBS_FROM_IP != null && envVars.COPY_JOBS_FROM_IP.length() > 0){
  		command = "${command} --copy-jobs-from-ip ${envVars.COPY_JOBS_FROM_IP}"
	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}
def deActivateServices(envVars){

	command = "./ansible.js --deactivate-services --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION}"
	if(envVars.CHAIN_ID != null && envVars.CHAIN_ID.length() > 0){
		command = "${command} --chain-id ${envVars.CHAIN_ID}"
	}

	if(envVars.IP_ADDRESSES != null && envVars.IP_ADDRESSES.length() > 0){
		command = "${command} --ip-addresses ${envVars.ip_addresses}"
	}
  if(envVars.CRON_JOBS != null && envVars.CRON_JOBS.length() > 0){
  		command = "${command} --cron-jobs ${envVars.CRON_JOBS}"
  	}

	if(envVars.COPY_JOBS_FROM_IP != null && envVars.COPY_JOBS_FROM_IP.length() > 0){
  		command = "${command} --copy-jobs-from-ip ${envVars.COPY_JOBS_FROM_IP}"
	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}
def removeServices(envVars){

	command = "./ansible.js --remove-systemd-services --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION}"
	if(envVars.CHAIN_ID != null && envVars.CHAIN_ID.length() > 0){
		command = "${command} --chain-id ${envVars.CHAIN_ID}"
	}

	if(envVars.IP_ADDRESSES != null && envVars.IP_ADDRESSES.length() > 0){
		command = "${command} --ip-addresses ${envVars.ip_addresses}"
	}
  if(envVars.CRON_JOBS != null && envVars.CRON_JOBS.length() > 0){
  		command = "${command} --cron-jobs ${envVars.CRON_JOBS}"
  	}
	if(envVars.COPY_JOBS_FROM_IP != null && envVars.COPY_JOBS_FROM_IP.length() > 0){
  		command = "${command} --copy-jobs-from-ip ${envVars.COPY_JOBS_FROM_IP}"
	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}
// Add configStrategy and activate
def configStrategy(envVars){
	command = "./ansible.js --${envVars.TASK}   --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION}"
	if (envVars.flush_memcache == 'true') {
    flush_options = '--flush-memcache';
  }
  if (envVars.flush_chain_memcache == 'true'){
    flush_options = flush_options + ' --flush-chain-memcache';
  }
  if(flush_options.length() > 0){
    command = "${command} ${flush_options}"
  }
  build_number = envVars.RPM_VERSION;
      if (build_number == null || build_number.length() < 1){
  		unstash 'RPM_INFO';
  		file_path = "${envVars.WORKSPACE}/rpm_builds/${envVars.APPLICATION}";
  		println "file_path: ${file_path}";
  		File buildFile = new File("${envVars.WORKSPACE}/rpm_builds/${envVars.APPLICATION}");

  		if( !buildFile.exists() ) {
  			throw new Exception("deployAppCode:: Build file doesn't exists for app: ${envVars.APPLICATION}!");
  		}

  		buildFile.eachLine { line ->
  			if( line.contains('RPM_VERSION') ) {
  				line_arr = line.split('=');
  				build_number = line_arr[1];
  				println "build_number :: ${build_number}";
  			}
  		}
  	}

  	if(build_number == null){
  		throw new Exception("deployAppCode:: Invalid Build number for app: ${envVars.APPLICATION}!");
  	}
  if(build_number.length() > 0){
    command = "${command} --build-number ${build_number}"
  }
	if(envVars.KIND != null && envVars.KIND.length() > 0){
		command = "${command} --config-kind ${envVars.KIND}"
	}
	if(envVars.ACTIVATE == 'true' ){
		command = "${command} --activate-config-strategy"
	}


	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}
def addUnderNagios(envVars){
  	command = "./ansible.js --nagios-update-configuration --target-platform-id ${envVars.PLATFORM} --target-env ${envVars.ENV}  --target-sub-env ${envVars.SUB_ENV} --target-app ${envVars.APPLICATION}"

  	if(envVars.restart == "true"){
		command = "${command} --service-action restart"
	}

  	if(envVars.CHAIN_ID != null && envVars.CHAIN_ID.length() > 0){
  		command = "${command} --target-chain-id ${envVars.CHAIN_ID}"
  	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def removeFromNagios(envVars){
  	command = "./ansible.js --nagios-remove-client-configuration --target-platform-id ${envVars.PLATFORM} --target-env ${envVars.ENV}  --target-sub-env ${envVars.SUB_ENV} --target-app ${envVars.APPLICATION}"

	if(envVars.restart == "true"){
		command = "${command} --service-action restart"
	}

  	if(envVars.CHAIN_ID != null && envVars.CHAIN_ID.length() > 0){
  		command = "${command} --target-chain-id ${envVars.CHAIN_ID}"
  	}

  	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
  	this.executeInShell(command, envVars, dryRun);
}

def updateNginxConf(envVars){

  	command = "./ansible.js --deploy-nginx-services --platform-id ${envVars.PLATFORM} --env ${envVars.ENV}  --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION} --service-action restart --force"

	if(envVars.IP_ADDRESSES != null && envVars.IP_ADDRESSES.length() > 0){
		command = "${command} --ip-addresses ${envVars.ip_addresses}"
	}

  	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
  	this.executeInShell(command, envVars, dryRun);
}
def deployNagiosClient(envVars){
  command = "./ansible.js --nagios-client-setup  --platform-id ${envVars.PLATFORM} --env ${envVars.ENV}  --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION} "

  	if(envVars.IP_ADDRESSES != null && envVars.IP_ADDRESSES.length() > 0){
  		command = "${command} --ip-addresses ${envVars.ip_addresses}"
  	}

    	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
    	this.executeInShell(command, envVars, dryRun);
}
def buildAppCode(envVars){

	if (envVars.RPM_VERSION == null || envVars.RPM_VERSION.length() < 1){
		if (env.sandbox != 'true' && env.main != 'true'){
			throw new Exception("Either sandbox or main needs to be selected for deployment!");
		}
	}
	if (env.sandbox == 'true' ){
       sub_env="sandbox"
   	}
  else if (env.main == 'true' ){
       sub_env="main"
    }

	result_out_file = this.getOutFileForTask('build', envVars);

	// Run build exec
	command = "./ansible.js --build --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${sub_env} --app ${envVars.APPLICATION} --branch-name ${envVars.BRANCH_NAME} --response-out-file ${result_out_file}";
	if (envVars.GITHUB_REPO && envVars.GITHUB_REPO.length()>0){
	  command = "${command} --github-repo ${envVars.GITHUB_REPO}"
	}
	this.executeInShell(command, envVars);

	output = this.getOutputForTask('build', envVars);

	build_number = output.data.buildNumber;

	println "****** build_number => ${build_number}";

	if(build_number != null){
		archiveArtifacts artifacts: "rpm_builds/${envVars.APPLICATION}", fingerprint: true
		stash includes: "rpm_builds/${envVars.APPLICATION}", name: 'RPM_INFO'
	}

	return build_number;
}

def deployAppCode(envVars){

	String restart_options = '--service-action restart';
	String flush_options = '';
	if (envVars.flush_memcache == 'true') {
		flush_options = '--flush-memcache';
	}
	if (envVars.flush_chain_memcache == 'true'){
		flush_options = flush_options + ' --flush-chain-memcache';
	}
	String force_restart = '';
	if(envVars.force_restart == 'true'){
		force_restart = "--force"
	}

	if (envVars.copy_only == 'true'){
		restart_options = '';
		flush_options = '';
		force_restart = '';
	}

	build_number = envVars.RPM_VERSION;
    if (build_number == null || build_number.length() < 1){
		unstash 'RPM_INFO';
		file_path = "${envVars.WORKSPACE}/rpm_builds/${envVars.APPLICATION}";
		println "file_path: ${file_path}";
		File buildFile = new File("${envVars.WORKSPACE}/rpm_builds/${envVars.APPLICATION}");

		if( !buildFile.exists() ) {
			throw new Exception("deployAppCode:: Build file doesn't exists for app: ${envVars.APPLICATION}!");
		}

		buildFile.eachLine { line ->
			if( line.contains('RPM_VERSION') ) {
				line_arr = line.split('=');
				build_number = line_arr[1];
				println "build_number :: ${build_number}";
			}
		}
	}

	if(build_number == null){
		throw new Exception("deployAppCode:: Invalid Build number for app: ${envVars.APPLICATION}!");
	}

	command = "./ansible.js --deploy --build-number ${build_number} --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --app ${envVars.APPLICATION} --copy-exec-files";
	if(restart_options.length() > 0){
		command = "${command} ${restart_options}"
	}
	if(flush_options.length() > 0){
		command = "${command} ${flush_options}"
	}
	if(force_restart.length() > 0){
		command = "${command} ${force_restart}"
	}

	if(envVars.ip_addresses != null && envVars.ip_addresses.length() > 0){
		command = "${command} --ip-addresses ${envVars.ip_addresses}"
	}

	if(envVars.app_status != null){
		command = "${command} --app-status ${envVars.app_status}"
	}

	if(envVars.VERIFY_APP_CONFIGS == 'true'){
		command = "${command} --verify-app-configs"
	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	// Run deploy exec
	if (envVars.sandbox == 'true'){
		this.executeInShell("${command} --sub-env sandbox", envVars, dryRun);
	}
	if (envVars.main == 'true'){
		this.executeInShell("${command} --sub-env main", envVars, dryRun);
	}
}

def getAppEc2Details(envVars){

	String resp_out_file = this.getOutFileForTask('ec2-details', envVars);

	command = "./app_setup.js --get-app-ec2-details --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV}  --app ${envVars.APPLICATION} --app-status '!deployReady' --response-out-file ${resp_out_file}";

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def markAsDeployReady(envVars){
	command = "./app_setup.js --mark-as-deploy-ready --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV}  --app ${envVars.APPLICATION} --ip-addresses ${envVars.IP_ADDRESSES}";

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def deployStaticFiles(envVars){

	// Run exec
	command = "./ansible.js --deploy-static-files --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env main --app ${envVars.APPLICATION} --branch-name ${envVars.BRANCH_NAME}";
	this.executeInShell(command, envVars);
}

def getBuildNumber(envVars){

	String build_number = null;
	file_path = "${envVars.WORKSPACE}/rpm_builds/${envVars.APPLICATION}";
	println "file_path: ${file_path}";
	File buildFile = new File("${envVars.WORKSPACE}/rpm_builds/${envVars.APPLICATION}");

	if( !buildFile.exists() ) {
		throw new Exception("deployAppCode:: Build file doesn't exists for app: ${envVars.APPLICATION}!");
	}

	buildFile.eachLine { line ->
		if( line.contains('RPM_VERSION') ) {
			line_arr = line.split('=');
			build_number = line_arr[1];
		}
	}

	return build_number;
}

def buildApp(platform,subEnv,env,application,branch){
   try {
      sh """#!/bin/bash
       source ~/.profile
      cd ${WORKSPACE}@script/ost-infra/executables/utils
      npm install;
      export OST_INFRA_WORKSPACE=${WORKSPACE}
      if [[ "$env" = "production" || "$env" = "sandbox" ]]
      then
         export INFRA_MYSQL_DB='ost_infra_production'
      fi
      ./ansible.js --build --branch-name "$branch" --app "$application" --platform-id "$platform" --env "$env" --sub-env "$subEnv"
      """
      archiveArtifacts 'rpm_builds/${APPLICATION}'
      stash includes: "rpm_builds/${APPLICATION}", name: 'RPM_INFO'
      }
      catch (err) {
         throw err
      }
}

def deployApp(platform,subEnv,env,application,rpmNumber,flush_options,restartOptions){
  try {
  if (rpmNumber.length() < 1){
   unstash 'RPM_INFO'
   File rpmFile = new File("${WORKSPACE}/rpm_builds/$application")
   if( !rpmFile.exists() ) {
      println "File does not exist"
      }
      rpmFile.eachLine { line ->
      if( line.contains('RPM_VERSION') ) {
        tempRpmNumber=line.split('=')
        rpmNumber=tempRpmNumber[1]
      }
   }
  }
  sh """#!/bin/bash
   source ~/.profile
   export OST_INFRA_WORKSPACE=${WORKSPACE}
   cd ${WORKSPACE}@script/ost-infra/executables/utils
   npm install;
    if [[ "$env" = "production" || "$env" = "sandbox" ]]
    then
      export INFRA_MYSQL_DB='ost_infra_production'
    fi
    if [[  -z "$flush_options" ]]
    then
      ./ansible.js --deploy --build-number $rpmNumber --app $application --platform-id $platform --env $env --sub-env $subEnv $restartOptions
    else
      ./ansible.js --deploy --build-number $rpmNumber --app $application --platform-id $platform --env $env --sub-env $subEnv $restartOptions $flush_options
    fi
    """
    currentBuild.description="PLATFORM:${PLATFORM}  ENV:${ENV} APPLICATION:${APPLICATION} RPM_VERSION: $rpmNumber "
    }
    catch (err) {
        throw err
    }
}

def restartAndFlushApp(envVars){
	platform = null
	if(envVars.PLATFORM != null){
		platform = envVars.PLATFORM;
	} else if(["cmsWeb", "cmsApi", "mappyWeb", "mappyApi", "ostInfra", "ostWeb"].contains(envVars.APPLICATION)){
		platform=1;
	} else if(['ostOrg'].contains(envVars.APPLICATION)){
		platform=2;
	} else if(["saasApi", "ostAnalytics", "ostView", "api", "web"].contains(envVars.APPLICATION)){
		platform=4;
	}

    String flush_options = '';
    if (envVars.flush_memcache == 'true') {
    	flush_options = '--flush-memcache';
    }

    if (envVars.flush_chain_memcache == 'true'){
    	flush_options = flush_options + ' --flush-chain-memcache';
    }

    String force_restart = '';
    if(envVars.force_restart == 'true'){
    	force_restart = "--force"
    }

	String command="./ansible.js  --service-action restart --app ${envVars.APPLICATION} --platform-id ${platform} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} ${flush_options} ${force_restart}"

	if(envVars.ip_addresses != null && envVars.ip_addresses.length() > 0){
  		command = "${command} --ip-addresses ${envVars.ip_addresses}"
  	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def lambdaUpdateCodeFromApp(envVars){

	String command="./ansible.js --deploy-lambda-code --copy-exec-files --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --app ${envVars.APPLICATION}"

	if(envVars.ip_addresses != null && envVars.ip_addresses.length() > 0){
  		command = "${command} --ip-addresses ${envVars.ip_addresses}"
  	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def setupValueNodes(envVars){

	String command="./value_chain.js --value-init-setup --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --chain-id ${envVars.CHAIN_ID}"

	if(envVars.ip_addresses != null && envVars.ip_addresses.length() > 0){
  		command = "${command} --ip-addresses ${envVars.ip_addresses}"
  	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def restartValueNodes(envVars){

	String command="./value_chain.js --restart --platform-id ${envVars.PLATFORM} --env ${envVars.ENV} --sub-env ${envVars.SUB_ENV} --chain-id ${envVars.CHAIN_ID}"

	if(envVars.ip_addresses != null && envVars.ip_addresses.length() > 0){
  		command = "${command} --ip-addresses ${envVars.ip_addresses}"
  	}

	Boolean dryRun = (envVars.dryRun == 'true' ? true : false);
	this.executeInShell(command, envVars, dryRun);
}

def lambdaUpdateCode(platform, env, subEnv, application, branchName){
    sh """#!/bin/bash

    source ~/.profile
    export OST_INFRA_WORKSPACE=${WORKSPACE}
    cd ${WORKSPACE}@script/ost-infra/executables/utils

    npm install;

    if [[ "$env" = "production" || "$env" = "sandbox" ]]; then
       export INFRA_MYSQL_DB='ost_infra_production'
    fi

    ./aws.js --lambda-update-code --platform-id "${platform}" --env "${env}" --sub-env "${subEnv}" --app "${application}" --branch-name "${branchName}"

    """
}

def getPlatformListForApp(){
	if(["cmsWeb", "cmsApi", "mappyWeb", "mappyApi", "ostInfra", "ostWeb"].contains(APPLICATION)){
		return [1];
	} else if(['ostOrg'].contains(APPLICATION)){
		return [2];
	} else if(["saasApi", "rabbitSaasApi", "utility", "ostAnalytics", "qaAutomationTests", "ostView", "value", "api", "web"].contains(APPLICATION)){
		return [4];
	}
}

def getChainIdsFor(platform, env, subEnv){
	str = "${env}-${subEnv}"
	if([4].contains(platform.toInteger())){
		switch(str) {
			case "staging-sandbox":
				return [197];
			case "staging-main":
				return [205];
			case "production-sandbox":
				return [1406, 1407];
			case "production-main":
				return [1414];
			default:
				return [];
		}
	} else {
		return [];
	}
}

def executeInShell(command, envVars, dryRun = false){

	if(command == null || command.length() < 1){
		throw new Exception("executeInShell:: Invalid command!");
	}

	println "\n\n**##****##****##****##****##****##****##****##****##****##****##****##****##****##****##**"
	println "executeInShell::command => ${command}"

	if(dryRun){
		return null;
	}

	lib_dir = envVars.WORKSPACE;
	if(envVars.WORKSPACE_LIB != null){
		lib_dir = envVars.WORKSPACE_LIB;
	}

    sh """#!/usr/bin/env bash

	source ~/.profile
	export OST_INFRA_WORKSPACE=${envVars.WORKSPACE}
	cd ${lib_dir}@script/ost-infra/executables/utils

	${command}

	"""
}


return this
