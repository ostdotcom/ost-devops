#!/usr/bin/env groovy

node {
	currentBuild.description = "=> PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, CHAIN_ID: ${env.CHAIN_ID}, EXECUTOR_NUMBER: ${env.EXECUTOR_NUMBER}, BUILD_ID: ${env.BUILD_ID}, BUILD_NUMBER: ${env.BUILD_NUMBER}, BUILD_DISPLAY_NAME: ${env.BUILD_DISPLAY_NAME}, ";
/*	echo sh(returnStdout: true, script: 'env')*/
	def lib_dir = env.WORKSPACE.split('@')[0];
	env.WORKSPACE_LIB = lib_dir;
	println "!!!!!!!!!!!!! WORKSPACE_LIB: ${env.WORKSPACE_LIB} !!!!!!!!!!!!!";
	def commonFunctions = load "${env.WORKSPACE_LIB}@script/jenkins/commonFunctions/commonFunctions.groovy";
	stage "Init Job"
		commonFunctions.initJob(env);
	stage "create EC2 App Stack"
		if(env.stack_setup == 'true'){
			commonFunctions.awsCreateAppStack(env);
		} else {
			commonFunctions.awsCreateAppServer(env);
		}
		sleep(time: 5, unit: "SECONDS");

		resp = commonFunctions.getOutputForTask('create-ec2', env);
		ips_list = []
		for (String ip_data : resp.data.ec2Instances) {
			ips_list.push(ip_data.ipAddress)
		}
		ip_str = ips_list.join(",")
	stage "App Setup"
		commonFunctions.setupValueNodes(env);
	stage "Restart Servers"
		env.ip_addresses = ip_str;
		commonFunctions.restartValueNodes(env);
	stage "Add new servers under nagios monitoring"
		env.restart = "true"
    	commonFunctions.addUnderNagios(env);
}
