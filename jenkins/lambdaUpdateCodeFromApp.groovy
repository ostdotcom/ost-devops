#!/usr/bin/env groovy
node {
	currentBuild.description = "=> PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, APPLICATION: ${env.APPLICATION}, EXECUTOR_NUMBER: ${env.EXECUTOR_NUMBER}, BUILD_ID: ${env.BUILD_ID}, BUILD_NUMBER: ${env.BUILD_NUMBER}, BUILD_DISPLAY_NAME: ${env.BUILD_DISPLAY_NAME}, ";
/*	echo sh(returnStdout: true, script: 'env')*/
	def lib_dir = env.WORKSPACE.split('@')[0];
	env.WORKSPACE_LIB = lib_dir;
	def commonFunctions = load "${env.WORKSPACE_LIB}@script/jenkins/commonFunctions/commonFunctions.groovy";
	stage "Init Job"
		commonFunctions.initJob(env);
	stage "Update Lambda Code"
		commonFunctions.lambdaUpdateCodeFromApp(env);
	}