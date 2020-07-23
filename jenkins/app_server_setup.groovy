#!/usr/bin/env groovy

node {
	currentBuild.description = "=> PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, APPLICATION: ${env.APPLICATION}, CHAIN_ID: ${env.CHAIN_ID}, BRANCH_NAME: ${env.BRANCH_NAME}, EXECUTOR_NUMBER: ${env.EXECUTOR_NUMBER}, BUILD_ID: ${env.BUILD_ID}, BUILD_NUMBER: ${env.BUILD_NUMBER}, BUILD_DISPLAY_NAME: ${env.BUILD_DISPLAY_NAME}, ";
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
	stage "app setup"
		env.CHAIN_ID = null;
		commonFunctions.appSetup(env);
	stage "Build from branch"
		if(env.SUB_ENV == 'sandbox'){
			env.sandbox = 'true';
		} else if(env.SUB_ENV == 'main'){
			env.main = 'true';			
		}
		String build_number = commonFunctions.buildAppCode(env);
		env.RPM_VERSION = build_number;
		echo "^^^^^^^ build number => ${build_number}";
		currentBuild.description = "${currentBuild.description}, RPM_VERSION: ${build_number}"
	stage "Get App EC2 details"
		env.app_status = '!deployReady';
		commonFunctions.getAppEc2Details(env);
		resp = commonFunctions.getOutputForTask('ec2-details', env);
		ips_list = []
		for (String ip_data : resp.data.ec2Instances) {
			ips_list.push(ip_data.ipAddress)
		}
		single_ip = ips_list[0];
		ip_str = ips_list.join(",")
	stage "Deploy build without restart"
		if(build_number != null) {
			env.ip_addresses = ip_str;
			env.app_status = '!deployReady';
			commonFunctions.deployAppCode(env);
		} else {
			echo "^^^^^^^^^^^^^^^ Build and deploy not required! ^^^^^^^^^^^^^^^"
		}
	stage "Create Cron entry"
		echo "^^^^^^^^^^^^^^^ Will run On IP => ${single_ip} ^^^^^^^^^^^^^^^"
		env.ip_addresses = single_ip;
		commonFunctions.addCronJobEntries(env);
	stage "Activate Services"
		env.ip_addresses = ip_str;
		env.restart = 'true';
		commonFunctions.activateServices(env);
	stage "Restart servers"
		env.ip_addresses = ip_str;
		env.force_restart = 'true';
		commonFunctions.restartAndFlushApp(env);
	stage "Mark machines are ready for deployment"
		env.ip_addresses = ip_str;
		commonFunctions.markAsDeployReady(env);
	stage "Add new infra under nagios monitoring "
		env.restart = "true"
    	commonFunctions.addUnderNagios(env);

}
