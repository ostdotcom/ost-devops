#!/usr/bin/env bash

function validateParameter(){
    var_name=$1
    var_val=$2

    if [[ -z ${var_val} ]]; then
        echo "Invalid value for parameter: ${var_name}"
        echo ${usage}
        exit 1
    fi
}

usage='\nUSAGE: ./lambda_update_code.sh --app <Application name> --aws-profile <AWS Profile> --function-arn <Lambda function ARN> --help'

while [ $# -gt 0 ]; do
    key=$1
    case ${key} in
        --app)
            shift
            export APPLICATION=$1
            validateParameter APPLICATION ${APPLICATION}
            ;;
        --branch-name)
            shift
            export BRANCH_NAME=$1
            validateParameter BRANCH_NAME ${BRANCH_NAME}
            ;;
        --build-no)
            shift
            export BUILD_NO=$1
            validateParameter BUILD_NO ${BUILD_NO}
            ;;
        --aws-profile)
            shift
            export AWS_PROFILE=$1
            validateParameter AWS_PROFILE ${AWS_PROFILE}
            ;;
        --function-arn)
            shift
            export FUNCTION_ARN=$1
            validateParameter FUNCTION_ARN ${FUNCTION_ARN}
            ;;
        --s3-bucket)
            shift
            export S3_BUCKET=$1
            validateParameter S3_BUCKET ${S3_BUCKET}
            ;;
        --package-file)
            shift
            export PACKAGE_FILE=$1
            ;;
        --help)
            echo $usage
            exit 0
            ;;
        *)
            echo $usage
            exit 1
            ;;
    esac
    shift
done

echo ""
echo "APPLICATION: ${APPLICATION}"
echo "BRANCH_NAME: ${BRANCH_NAME}"
echo "BUILD_NO: ${BUILD_NO}"
echo "AWS_PROFILE: ${AWS_PROFILE}"
echo "FUNCTION_ARN: ${FUNCTION_ARN}"
echo "S3_BUCKET: ${S3_BUCKET}"
echo "PACKAGE_FILE: ${PACKAGE_FILE}"
echo ""

function getCodeFromGit(){

    application=$1
    workspace=$2
    branch_name=$3

    repo_url="git@github.com:ostdotcom";
    repo_dir="";

    if [[ ${application} == "ostInfra" ]]; then
        repo_dir="ost-devops";
    fi

    if [[ -z ${repo_dir} ]]; then
        echo "Invalid repo dir for app: ${application}";
        exit 1;
    fi

    # Checkout repo
    echo "";
    echo "$seperator_line Checkout git branch [START] $seperator_line";
#    workspace=${INFRA_WORKSPACE};
    echo "workspace: ${workspace}";
    echo "repo_dir: ${repo_dir}";
    builds_path=${workspace}/rpm_builds;
    mkdir -p ${builds_path};
    cd ${builds_path};
    repo_full_path=${builds_path}/${repo_dir};
    if [[ ! -d ${repo_dir} ]]; then
      git clone ${repo_url}/${repo_dir}.git;
    fi
    cd ${repo_full_path} ;
    git stash ;
    git pull --rebase ;
    git checkout ${branch_name} ;
    if [[ $? != 0 ]]; then
        error_msg "Invalid branch!!!";
        exit 1;
    fi
    git pull --rebase ;
    if [[ $? != 0 ]]; then
        error_msg "rebase failed";
        exit 1;
    fi
    CURRENT_GIT_HEAD=$(git rev-parse HEAD);
    # Get old build details
    file_to_register=${builds_path}/${application};
    if [[ -f ${file_to_register} ]]; then
        source ${file_to_register}
        if [[ "$CURRENT_GIT_HEAD" != "$GIT_HEAD" ]]; then
            echo ""
            echo "File changes from last build:"
            echo ""
            echo "$(git log --pretty=oneline --name-status ${GIT_HEAD}..${CURRENT_GIT_HEAD})"
            echo ""
        else
            echo ""
            echo "No changes detected in git branch (${branch_name}) since last build #: ${RPM_VERSION}"
            echo ""
        fi
    else
        echo "Previous build file not found!"
    fi

    if [[ ${application} == "ostInfra" ]]; then
        repo_full_path=${repo_full_path}/ost-infra
        echo "New repo_full_path: ${repo_full_path}"
    fi

    echo "$seperator_line Checkout git branch [END] $seperator_line";

    # Return values
    export REPO_FULL_PATH=${repo_full_path}
    export GIT_HEAD=${GIT_HEAD}

}

function createBuildAndUpload(){

    pkg_file_name=$1
    repo_path=$2
    s3_key="lambda/${APPLICATION}/${pkg_file_name}_${BUILD_NO}.zip"

    if [[ -z ${pkg_file_name} ]]; then
        echo "Package file identifier required!"
        exit 1
    fi

    export prevDir=`cd ${repo_path} ; cd ..; pwd`

    echo "repo_path: ${repo_path}"
    echo "prevDir: ${prevDir}"

    chmod -R 755 ${repo_path}

    lambda_file="${prevDir}/lambda_${APPLICATION}_${pkg_file_name}_${BUILD_NO}.zip"

    src_package_file="${repo_path}/${pkg_file_name}.json"
    dest_package_file="${repo_path}/package.json"

    if [[ ! -f ${src_package_file} ]]; then
        echo "Package file [ ${src_package_file}.json ] does not exists!"
        exit 1
    fi

    if [[ ${src_package_file} != ${dest_package_file} ]]; then
        cp -r ${src_package_file} ${dest_package_file}
    fi

    rm -rf ${repo_path}/package-lock.json

    cd ${repo_path}

    npm install --production
    zip -q --exclude log/\* --exclude \.git\* --exclude set_env_vars.sh -r ${lambda_file} .

    echo "Compression done!"

    cd -

    aws s3 cp ${lambda_file} s3://${S3_BUCKET}/${s3_key} --quiet --profile ${AWS_PROFILE}
    if [[ $? != 0 ]]; then
        echo "Error uploading build to S3!"
        exit 1
    fi

    echo "Upload done!"

    rm -f ${lambda_file}

    # Return values
    export S3_KEY=${s3_key}

}

function updateLambdaFunction(){

    s3_key=$1

    echo "Updating lambda function code for arn: ${FUNCTION_ARN}"

    echo "s3_key: ${s3_key}"
    aws lambda update-function-code --function-name ${FUNCTION_ARN} --s3-bucket ${S3_BUCKET} --s3-key ${s3_key} --publish --query '{FunctionName:FunctionName,CodeSize:CodeSize,Timeout:Timeout,MemorySize:MemorySize,RevisionId:RevisionId}' --profile ${AWS_PROFILE}
    if [[ $? != 0 ]]; then
        echo "Error updating lambda function code for ${FUNCTION_ARN}!"
        exit 1
    fi
    echo "Updated lambda function code for arn: ${FUNCTION_ARN}"

}

function main() {

    # Include global vars
    . ../utils/global_vars.sh;

    getCodeFromGit ${APPLICATION} ${OST_INFRA_WORKSPACE} ${BRANCH_NAME}

    if [[ -z ${PACKAGE_FILE} ]]; then
        package_file='package'
    else
        package_file=${PACKAGE_FILE}
    fi

    createBuildAndUpload ${package_file} ${REPO_FULL_PATH}

    updateLambdaFunction ${S3_KEY}

    echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n"

}

main
