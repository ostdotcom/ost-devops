#!/bin/bash

err_col='\033[0;31m'
no_col='\033[0m'

aws_cmd=$(command -v aws);
if [[ -z $aws_cmd ]]; then
  alias aws="~/.local/bin/aws"
fi


function error_msg() {
	echo "${err_col}${1}${no_col}"
}

function configure_aws() {
	aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID --profile $AWS_PROFILE;
	aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY --profile $AWS_PROFILE;
	aws configure set region $AWS_REGION --profile $AWS_PROFILE;
	aws configure set output $AWS_CLI_OUTPUT --profile $AWS_PROFILE;
	aws configure set s3.signature_version s3v4 --profile $AWS_PROFILE;
}

# Is web type app, based on this asset pipeline etc... works
function is_web_type_app() {
	app=$1;
	if [[  $app == "web" || $app == "ostWeb" || $app == "cmsWeb" || $app == "ostView" || $app == "ostOrg" ]]; then
		echo 1;
	else
		echo 0;
	fi
}
function is_static() {
	app=$1;
	if [[ $app == "mappyWeb" ]]; then
		echo 1;
	else
		echo 0;
	fi
}
# Is NodeJs App
function is_nodejs_app() {
	app=$1;
	if [[ $app == "mappyWeb" || $app == "ostView" || $app == "saasApi" || $app == "analytics" || $app == "ostInfra" ]]; then
		echo 1;
	else
		echo 0;
	fi
}

function is_rails_app() {
	app=$1;
	if [[ $app == 'web' ||$app == 'cmsApi' || $app == 'cmsWeb' || $app == 'mappyApi'|| $app == 'api' || $app == 'ostWeb' || $app == 'ostOrg' ]]; then
		echo 1;
	else
		echo 0;
	fi
}

# Check whether app has sub environments
function has_sub_environment() {
	app=$1;
	if [[  $app == "api" ||$app == "mappyApi"|| $app == "utility" || $app == "web" || $app == "saasApi" || $app == "ostView" ]]; then
		echo 1;
	else
		echo 0;
	fi
}

# Check whether app has multiple platform for given environment
function has_multiplatform() {
	app=$1;
	env=$2;
	if [[ $env == 'staging' && ($app == "api" ||  $app == "web" || $app == "saasApi" || $app == "ostView" || $app == "utility" || $app == "value" ) ]]; then
		echo 1;
	elif [[ $env == 'production' && ($app == "api" ||  $app == "web" || $app == "saasApi" || $app == "ostView" || $app == "utility" || $app == "value" ) ]]; then
	    echo 1;
	else
		echo 0;
	fi
}

# Create js/css files from typeScript for Angular
function has_typeScript() {
	echo 0;
}

function is_utility_chain() {
 platform_node_type=$1
 if [[ ${platform_node_type} = "utility" ]]
 then
   echo 1
 else
   echo 0
 fi
}
