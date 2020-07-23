#!/usr/bin/env groovy

node {
	currentBuild.description = "add Crons to machine Params => PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, APPLICATION: ${env.APPLICATION}";
	def lib_dir = env.WORKSPACE.split('@')[0];
	env.WORKSPACE_LIB = lib_dir;
	println "!!!!!!!!!!!!! WORKSPACE_LIB: ${env.WORKSPACE_LIB} !!!!!!!!!!!!!";
	def commonFunctions = load "${env.WORKSPACE_LIB}@script/jenkins/commonFunctions/commonFunctions.groovy";
	
	stage "Init Job"
		commonFunctions.initJob(env);
	
	if(env.RPM_VERSION.length() > 0){
		
		stage "Build without restart"
			env.copy_only = "true";
			env.main = "true";
			commonFunctions.deployAppCode(env);
			
	}
	
	stage "Add crons"
		commonFunctions.addCronJobEntries(env);
	
	if(env.ACTIVATE_JOBS == 'true'){
		
		stage "Activate Services"
			commonFunctions.activateServices(env);
	}

}
