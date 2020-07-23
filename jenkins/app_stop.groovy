#!/usr/bin/env groovy

node {
	currentBuild.description = "=> PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, APPLICATION_GROUP: ${env.APPLICATION_GROUP}, CHAIN_ID: ${env.CHAIN_ID}";
	def lib_dir = env.WORKSPACE.split('@')[0];
	env.WORKSPACE_LIB = lib_dir;
	println "!!!!!!!!!!!!! WORKSPACE_LIB: ${env.WORKSPACE_LIB} !!!!!!!!!!!!!";
	def commonFunctions = load "${env.WORKSPACE_LIB}@script/jenkins/commonFunctions/commonFunctions.groovy";
	app_list = commonFunctions.getAppListForGroup(env.APPLICATION_GROUP);
	if(app_list.size() < 1){
		println "!!! Not implemented for app group: ${env.APPLICATION_GROUP} !!!";
		return;
	}
	stage "Init Job"
		commonFunctions.initJob(env);
	stage "Remove from Nagios Monitoring"
		for (String app : app_list) {
			env.APPLICATION = app;
			env.restart = "true"
			commonFunctions.removeFromNagios(env)
		}
	stage "Stop Servers"
		for (String app : app_list) {
			env.APPLICATION = app;
			commonFunctions.stopApp(env);
		}
}