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

APPLICATION="apiDocs";
PLATFORM=1;

echo "";
echo "ENV: $ENV";
echo "PLATFORM: $PLATFORM";
echo "APPLICATION: $APPLICATION";
echo "BRANCH_NAME: $BRANCH_NAME";
echo "";

aws_region="us-east-1";
s3_upload_bucket="s3://docs.ost.com";
cloudfront_distribution_id="E2ZQRP2L4D761I";

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

#Clean bucket
echo "aws s3  rm --recursive $s3_upload_bucket/"
aws s3  rm --recursive $s3_upload_bucket/
if [[ $? != 0 ]]; then
    error_msg "S3 Cleanup Failed!!!";
    exit 1;
fi
# Upload static files to S3 bucket
cd $repo_full_path;
echo "pwd: $(pwd)";
echo "aws s3 cp --recursive website/build/OST\ KIT\ alpha/ $s3_upload_bucket/ --acl public-read"
aws s3 cp --recursive build-root/ $s3_upload_bucket/ --acl public-read
if [[ $? != 0 ]]; then
    error_msg "S3 Build upload failed!!!";
    exit 1;
fi

#  Change metadata for svg files
aws s3 cp --recursive  --exclude '*'  --include '*.svg' --content-type="image/svg+xml" --metadata-directive="REPLACE" $s3_upload_bucket $s3_upload_bucket --acl public-read


# Invalidate cloudfront cache
echo "aws cloudfront create-invalidation --distribution-id $cloudfront_distribution_id --paths \"/*\""
aws cloudfront create-invalidation --distribution-id $cloudfront_distribution_id --paths "/*"
if [[ $? != 0 ]]; then
    error_msg "CF Cache invalidation failed!!!";
    exit 1;
fi

echo "";
echo "APPLICATION: $APPLICATION  --- ENV: $ENV --- REGION: $REGION --- PLATFORM: $PLATFORM --- BRANCH_NAME: $BRANCH_NAME";
echo "";
