#!/usr/bin/env groovy

node {
	currentBuild.description = "activate Crons on machine Params => PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, APPLICATION: ${env.APPLICATION} ";
	def lib_dir = env.WORKSPACE.split('@')[0];
	env.WORKSPACE_LIB = lib_dir;
	println "!!!!!!!!!!!!! WORKSPACE_LIB: ${env.WORKSPACE_LIB} !!!!!!!!!!!!!";
	def commonFunctions = load "${env.WORKSPACE_LIB}@script/jenkins/commonFunctions/commonFunctions.groovy";
	stage "Init Job"
		commonFunctions.initJob(env);

	stage "activate services"
			commonFunctions.activateServices(env);


}
