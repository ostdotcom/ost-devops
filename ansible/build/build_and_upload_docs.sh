#!/usr/bin/env bash

status=0
link_path=$(pwd);
current_file=$0;
if [[ -L $current_file ]]; then
  actual_file_path=$(readlink -n $current_file);
  actual_dir=$(dirname $actual_file_path);
else
  actual_dir=$(pwd);
fi

cd $actual_dir;


# Include global vars
. ../utils/global_vars.sh;

# Include common functions
. ../utils/functions.sh;

## Test vars start
#ENV="staging";
#BRANCH_NAME="master";
## Test vars end

APPLICATION="apiDocs";
PLATFORM=1;

echo "";
echo "ENV: $ENV";
echo "PLATFORM: $PLATFORM";
echo "APPLICATION: $APPLICATION";
echo "BRANCH_NAME: $BRANCH_NAME";
echo "";

ST_PROFILE=company
# AWS CLI profile to use, you can create profile using function "configure_aws"
AWS_PROFILE="company-production-apiDocs"
S3_UPLOAD_BUCKET="s3://docs.ost.com"
S3_REGION="us-east-1"
AWS_CLI_OUTPUT="json"

# AWS hosted api docs cloudfront distribution
CLOUDFRONT_DISTRIBUTION_ID="E2ZQRP2L4D761I";

aws_profile=$AWS_PROFILE;
aws_region=$S3_REGION;
s3_upload_bucket=$S3_UPLOAD_BUCKET;
cloudfront_distribution_id=$CLOUDFRONT_DISTRIBUTION_ID;

seperator_line="~~~~~~~~~~~~";
repo_dir="website-docupony";

# Checkout repo
echo "";
echo "$seperator_line Checkout git branch [START] $seperator_line";
workspace=$link_path;
#cd $workspace;
echo "workspace: $workspace";
echo "actual_dir: $actual_dir";
echo "repo_dir: $repo_dir";
builds_path=$workspace/rpm_builds;
mkdir -p $builds_path;
cd $builds_path;
repo_full_path=$builds_path/$repo_dir;
if [[ ! -d $repo_dir ]]; then
  git clone git@github.com:ostdotcom/$repo_dir.git;
fi
cd $repo_full_path ; git stash ; git pull --rebase ; git checkout $BRANCH_NAME ;
if [[ $? != 0 ]]; then
    error_msg "Invalid branch!!!";
    exit 1;
fi
cd $repo_full_path ; git pull --rebase ;
echo "$seperator_line Checkout git branch [END] $seperator_line";

# Install required libs
echo "which node => $(which node)";
cd $repo_full_path ;
if [[ -f package-lock.json ]]; then
  rm -f package-lock.json;
fi

npm install --production ;
status=$(( $status + $? ))
${repo_full_path}/node_modules/.bin/gulp  generate-all-docs

status=$(( $status + $? ))

if [[ $status -ne 0 ]]; then
    error_msg "npm install failed!!!";
    exit 1;
fi



#cd $actual_dir;
#inventory_file="../inventories/localhost.yml";
#playbook="../plays/local/api_docs_upload.yml"

#env ansible-playbook -i $inventory_file $playbook --extra-vars "APPLICATION=$APPLICATION ENV=$ENV REPO_FULL_PATH=$repo_full_path LOCAL_USER=$LOCAL_USER";
#if [[ $? != 0 ]]; then
#    error_msg "Replace text failed!!!";
#    exit 1;
#fi


#Clean bucket
echo "aws s3  rm --recursive $s3_upload_bucket/ --profile $aws_profile"
aws s3  rm --recursive $s3_upload_bucket/ --profile $aws_profile
if [[ $? != 0 ]]; then
    error_msg "S3 Cleanup Failed!!!";
    exit 1;
fi
# Upload static files to S3 bucket
cd $repo_full_path;
echo "pwd: $(pwd)";
echo "aws s3 cp --recursive website/build/OST\ KIT\ alpha/ $s3_upload_bucket/ --acl public-read --profile $aws_profile"
aws s3 cp --recursive build-root/ $s3_upload_bucket/ --acl public-read --profile $aws_profile
if [[ $? != 0 ]]; then
    error_msg "S3 Build upload failed!!!";
    exit 1;
fi

#  Change metadata for svg files
aws s3 cp --recursive  --exclude '*'  --include '*.svg' --content-type="image/svg+xml" --metadata-directive="REPLACE" $s3_upload_bucket $s3_upload_bucket --acl public-read --profile $aws_profile


# Invalidate cloudfront cache
echo "aws cloudfront create-invalidation --distribution-id $cloudfront_distribution_id --paths "/*" --profile $aws_profile"
aws cloudfront create-invalidation --distribution-id $cloudfront_distribution_id --paths "/*" --profile $aws_profile
if [[ $? != 0 ]]; then
    error_msg "CF Cache invalidation failed!!!";
    exit 1;
fi

echo "";
echo "APPLICATION: $APPLICATION  --- ENV: $ENV --- REGION: $REGION --- PLATFORM: $PLATFORM --- BRANCH_NAME: $BRANCH_NAME";
echo "";
