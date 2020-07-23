#!/usr/bin/env groovy

node {
	currentBuild.description = "=> PLATFORM: ${env.PLATFORM}, SUB_ENV:${env.SUB_ENV}, ENV:${env.ENV}, APPLICATION:${env.APPLICATION}, CHAIN_ID:${env.CHAIN_ID}"
	def lib_dir = env.WORKSPACE.split('@')[0];
	env.WORKSPACE_LIB = lib_dir;
	println "!!!!!!!!!!!!! WORKSPACE_LIB: ${env.WORKSPACE_LIB} !!!!!!!!!!!!!";
	def commonFunctions = load "${env.WORKSPACE_LIB}@script/jenkins/commonFunctions/commonFunctions.groovy";
	stage "InitJob"
		commonFunctions.initJob(env)
	stage "updateEc2InstanceData"
    	commonFunctions.updateEc2InstanceData(env)
	if(env.UPDATE_NAGIOS == "true"){
		stage "Remove from Nagios Server"
			commonFunctions.removeFromNagios(env)
		stage "Update Nagios Server"
		    env.restart = "true"
			commonFunctions.addUnderNagios(env)
	}
}