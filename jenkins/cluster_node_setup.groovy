#!/usr/bin/env groovy

node {
	currentBuild.description = "Creats EC2 apps for app group. Params => PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, APPLICATION: ${env.APPLICATION}, CHAIN_ID: ${env.CHAIN_ID}, BRANCH_NAME: ${env.BRANCH_NAME}";
	def commonFunctions = load "${env.WORKSPACE}@script/jenkins/commonFunctions/commonFunctions.groovy";
	stage "Init Job"
		commonFunctions.initJob(env);
	stage "create EC2 App Stack"
		if(env.stack_setup == 'true'){
			commonFunctions.awsCreateAppStack(env);
		} else {
			commonFunctions.awsCreateAppServer(env);
		}
		sleep(time: 5, unit: "SECONDS");
	stage "app setup"
		commonFunctions.appSetup(env);

//	stage "Activate Services"
//		commonFunctions.activateServices(env);

	stage "Add new infra under nagios monitoring "
		env.restart = "true"
		commonFunctions.addUnderNagios(env);

}
