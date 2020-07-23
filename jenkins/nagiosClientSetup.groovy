#!/usr/bin/env groovy

node {
	currentBuild.description = "=> PLATFORM: ${env.PLATFORM}, SUB_ENV:${env.SUB_ENV}, ENV:${env.ENV}, APPLICATION: ${env.APPLICATION}, IP_ADDRESSES: ${env.IP_ADDRESSES}"
	def lib_dir = env.WORKSPACE.split('@')[0];
	env.WORKSPACE_LIB = lib_dir;
	println "!!!!!!!!!!!!! WORKSPACE_LIB: ${env.WORKSPACE_LIB} !!!!!!!!!!!!!";
	def commonFunctions = load "${env.WORKSPACE_LIB}@script/jenkins/commonFunctions/commonFunctions.groovy";
	stage "InitJob"
		commonFunctions.initJob(env)
	stage "updateNginxConf"
    	commonFunctions.deployNagiosClient(env)
}
