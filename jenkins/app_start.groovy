#!/usr/bin/env groovy

node {
	currentBuild.description = "=> PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, APPLICATION_GROUP: ${env.APPLICATION_GROUP}, CHAIN_ID: ${env.CHAIN_ID}";
	def lib_dir = env.WORKSPACE.split('@')[0];
	env.WORKSPACE_LIB = lib_dir;
	println "!!!!!!!!!!!!! WORKSPACE_LIB: ${env.WORKSPACE_LIB} !!!!!!!!!!!!!";
	def commonFunctions = load "${env.WORKSPACE_LIB}@script/jenkins/commonFunctions/commonFunctions.groovy";
	app_list = commonFunctions.getAppListForGroup(env.APPLICATION_GROUP);
	app_list = app_list.reverse();
	if(app_list.size() < 1){
		println "!!! Not implemented for app group: ${env.APPLICATION_GROUP} !!!";
		return;
	}
	stage "Init Job"
		commonFunctions.initJob(env);
	stage "Start Servers"
		for (String app : app_list) {
			env.APPLICATION = app;
			commonFunctions.startApp(env);
		}
	stage "Add to Nagios Monitoring"
		appListSize = app_list.size();
		for (i=0;i<appListSize;i++) {
			env.APPLICATION = app_list[i];
			// Restart nagios with last app in list
			if (i == appListSize-1) {
				env.restart = "true"	
			}
			commonFunctions.addUnderNagios(env)
		}
}