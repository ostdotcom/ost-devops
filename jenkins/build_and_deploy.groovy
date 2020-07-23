node {
	currentBuild.description = "PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, APPLICATION: ${env.APPLICATION}, BRANCH_NAME: ${env.BRANCH_NAME} VERIFY_APP_CONFIGS: ${env.VERIFY_APP_CONFIGS}"
	def commonFunctions = load "${env.WORKSPACE}@script/jenkins/commonFunctions/commonFunctions.groovy"
	stage "InitJob"
		commonFunctions.initJob(env);
	stage "buildApp"
		String build_number = commonFunctions.buildAppCode(env);
		currentBuild.description = "${currentBuild.description}, RPM_VERSION: ${build_number}"
	stage "deployApp"
		commonFunctions.deployAppCode(env);
}


