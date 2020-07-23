node {
	currentBuild.description = "PLATFORM: ${env.PLATFORM}, SUB_ENV: ${env.SUB_ENV}, ENV: ${env.ENV}, APPLICATION: ${env.APPLICATION}, BRANCH_NAME: ${env.BRANCH_NAME}"
	def commonFunctions = load "${env.WORKSPACE}@script/jenkins/commonFunctions/commonFunctions.groovy"
	stage "InitJob"
		commonFunctions.initJob(env);
	stage "Deploy static files"
		commonFunctions.deployStaticFiles(env);
}


