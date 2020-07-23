#!/usr/bin/env groovy

node {
	currentBuild.description = "add config Strategy => PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, APPLICATION: ${env.APPLICATION} ";
	def lib_dir = env.WORKSPACE.split('@')[0];
	env.WORKSPACE_LIB = lib_dir;
	println "!!!!!!!!!!!!! WORKSPACE_LIB: ${env.WORKSPACE_LIB} !!!!!!!!!!!!!";
	def commonFunctions = load "${env.WORKSPACE_LIB}@script/jenkins/commonFunctions/commonFunctions.groovy";
	env.copy_only = 'true' ;
  if(env.SUB_ENV == 'main'){
    env.main='true';
  }
  else if(env.SUB_ENV == 'sandbox'){
    env.sandbox='true';
  }
	stage "Init Job"
		commonFunctions.initJob(env);
  stage "buildApp"
  		String build_number = commonFunctions.buildAppCode(env);
  		currentBuild.description = "${currentBuild.description}, RPM_VERSION: ${build_number}"
  stage "deployApp"
  		commonFunctions.deployAppCode(env);
	stage "add config strategy"
			commonFunctions.configStrategy(env);


}
