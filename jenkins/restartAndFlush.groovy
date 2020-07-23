#!/usr/bin/env groovy

node {
	currentBuild.description = "Restart and FLush APP. Params => ENV: ${env.ENV}, SUB_ENV: ${env.SUB_ENV}, APPLICATION: ${env.APPLICATION}";
	def lib_dir = env.WORKSPACE.split('@')[0];
	env.WORKSPACE_LIB = lib_dir;
	println "!!!!!!!!!!!!! WORKSPACE_LIB: ${env.WORKSPACE_LIB} !!!!!!!!!!!!!";
	def commonFunctions = load "${env.WORKSPACE_LIB}@script/jenkins/commonFunctions/commonFunctions.groovy";
	stage "Init Job"
		commonFunctions.initJob(env);
	stage "restartAndFLush"

    commonFunctions.restartAndFlushApp(env)
}
