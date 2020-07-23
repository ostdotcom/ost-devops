#!/usr/bin/env bash

SELF=$(basename $0)
DIR_NAME=$(dirname $0);
APP_ROOT=$(cd ${DIR_NAME} ; cd .. ; pwd)

while [[ $# -gt 0 ]]
do
    key="$1";
    usage_str="Usage: ./${SELF} --env [ Environment ] --help"
    # Read parameters
    case ${key} in
        --env)
            shift
            ENV=$1
            ;;
        --application)
            shift
            APPLICATION=$1
            ;;
        --s3-path)
            shift
            S3_PATH=$1
            ;;
        --aws-profile)
            shift
            AWS_PROFILE=$1
            ;;
        --branch-name)
            shift
            BRANCH_NAME=$1
            ;;
        --build-files-path)
            shift
            BUILD_FILES_PATH=$1
            ;;
        --help)
            echo ${usage_str}
            exit 0
            ;;
        *)  # unknown option
            echo ${usage_str};
            exit 1
            ;;
    esac
    shift
done

function error_handling(){
    msg=$1
    echo "Error:: ${msg}"
    exit 1
}

# Validate inputs
if [[ ${ENV} != "staging" && ${ENV} != "production" ]]; then
    error_handling "Invalid environment"
fi

if [[ -z ${APPLICATION} ]]; then
    error_handling "Invalid application identifier"
fi

if [[ -z ${S3_PATH} ]]; then
    error_handling "Invalid S3_PATH"
fi

if [[ -z ${AWS_PROFILE} ]]; then
    error_handling "Invalid AWS profile"
fi

# Check ENV vars present before executing task
if [[ -z ${OST_INFRA_WORKSPACE} ]]; then
    error_handling "ENV variable for OST_INFRA_WORKSPACE is not set"
fi


app_workspace=${OST_INFRA_WORKSPACE};
seperator_line="~~~~~~~~~~~~";

if [[ ${APPLICATION} == "ostPrototypes" ]]; then
    repo_dir="ost-web-prototypes";
fi

if [[ -z ${repo_dir} ]]; then
    error_handling "Invalid repo_dir for app: ${APPLICATION}"
fi

echo "";
echo "${seperator_line} Checkout git branch [START] ${seperator_line}";
echo "app_workspace: ${app_workspace}";
echo "repo_dir: ${repo_dir}";
builds_path=${app_workspace}/rpm_builds;
mkdir -p ${builds_path};
cd ${builds_path};
repo_full_path=${builds_path}/$repo_dir;
if [[ ! -d $repo_dir ]]; then
  git clone git@github.com:ostdotcom/${repo_dir}.git;
fi
cd ${repo_full_path} ; git stash ; git pull --rebase ; git checkout ${BRANCH_NAME} ;
if [[ $? != 0 ]]; then
    error_handling "Invalid branch name"
fi
cd ${repo_full_path} ; git pull --rebase ;
echo "${seperator_line} Checkout git branch [END] ${seperator_line}";

# Minify and compress static assets
echo "${seperator_line} Compress js and css files ${seperator_line}"
cd ${repo_full_path}
sh devops/compress.sh
if [[ $? != 0 ]]; then
    error_handling "Error in assets compression";
fi

if [[ -z ${BUILD_FILES_PATH} ]]; then
    src_files_path=${repo_full_path}
else
    src_files_path="${repo_full_path}/${BUILD_FILES_PATH}"
fi

# Upload static files to S3 bucket
echo "\n${seperator_line} Upload only css and js files ${seperator_line} "
aws s3 cp --recursive --exclude "*" --include "*.js" --include "*.css" ${src_files_path}/ ${S3_PATH}/ --acl public-read --content-encoding gzip --cache-control 'public, max-age=315360000' --expires 'Thu, 25 Jun 2025 20:00:00 GMT' --profile ${AWS_PROFILE}
if [[ $? != 0 ]]; then
    error_handling "S3 upload failed for js/css";
fi

echo "\n${seperator_line} Upload all except css and js files ${seperator_line}"
aws s3 cp --recursive --include "*" --exclude "*.js" --exclude "*.css" ${src_files_path}/ ${S3_PATH}/ --acl public-read --cache-control 'public, max-age=315360000' --expires 'Thu, 25 Jun 2025 20:00:00 GMT' --profile ${AWS_PROFILE}
if [[ $? != 0 ]]; then
    error_handling "S3 upload failed for html";
fi
