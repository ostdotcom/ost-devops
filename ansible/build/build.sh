#!/bin/bash
export st_profile="company"
tar_exclusions=(.git .gitignore Gemfile.lock .bundle .DS_Store tmp node_modules set_env_vars.sh app/angular-app)
function getArgs()
{
  while getopts ":a:p:b:n:u:e:g:" options
  do
    case "${options}" in
        a)
            export APPLICATION=${OPTARG}
            ;;
        n)
            export BUILD_NUM=${OPTARG}
            ;;
        p)
            export AWS_PROFILE=${OPTARG}
            ;;
        b)
            export BRANCH_NAME=${OPTARG}
            ;;
        u)
            export S3_BUILDS_PATH=${OPTARG}
            ;;
        e)
            export ENV=${OPTARG}
            ;;
        g)
            export GITHUB_REPO=${OPTARG}
            ;;
    esac
 done
 shift $((OPTIND-1))


 if [[ ( ! -z ${APPLICATION}  && ! -z ${BRANCH_NAME} && ! -z ${S3_BUILDS_PATH}  ) ]]
 then
   echo "Valid input "
   export RUN_NON_INTERACTIVE="true"
 else
     export RUN_NON_INTERACTIVE=""

 fi

}
getArgs $@
# Include global vars
. ../utils/global_vars.sh;

# Include common functions
. ../utils/functions.sh;


echo "";

echo "APPLICATION: $APPLICATION";
echo "BRANCH_NAME: $BRANCH_NAME";
echo "";
plt_str="platform_${PLATFORM}";

if [[ -z $BRANCH_NAME ]]; then
      error_msg "BRANCH_NAME should not be is empty!";
      exit 1;
  fi


# Set AWS profile to use cli

s3_builds_path=$S3_BUILDS_PATH;

seperator_line="~~~~~~~~~~~~";

repo_url="git@github.com:ostdotcom";
repo_dir="";
if [[ $st_profile == "company" ]]; then
  if [[ $APPLICATION == "web" ]]; then
    repo_url="git@github.com:OpenST";
    repo_dir="kit-web";
  elif [[ $APPLICATION == "api" ]]; then
    repo_url="git@github.com:OpenST";
    repo_dir="kit-api";
  elif [[ $APPLICATION == "saasApi" ]]; then
    repo_url="git@github.com:OpenST";
    repo_dir="platform-api";
    tar_exclusions+=('package-lock.json')
  elif [[ $APPLICATION == "ostView" ]]; then
    repo_dir="ost-view";
    tar_exclusions+=('package-lock.json')
  elif [[ $APPLICATION == "ostWeb" ]]; then
    repo_dir="ost-web";
  elif [[ $APPLICATION == "cmsWeb" ]]; then
      repo_dir="ost-cms-web";
  elif [[ $APPLICATION == "cmsApi" ]]; then
      repo_dir="ost-cms-api";
  elif [[ $APPLICATION == "ostAnalytics" ]]; then
      repo_dir="analytics";
  elif [[ $APPLICATION == "ostInfra" ]]; then
    repo_url="git@github.com:OpenST";
    repo_dir="ost-devops";
    tar_exclusions+=('package-lock.json')
  elif [[ $APPLICATION == "mappyApi" ]]; then
    repo_dir="demo-server";
    tar_exclusions+=('package-lock.json')
  elif [[ $APPLICATION == "mappyWeb" ]]; then
    repo_dir="demo-client";
    tar_exclusions+=('package-lock.json')
  elif [[ $APPLICATION == "ostOrg" ]]; then
    repo_dir="foundation-web";
  fi
fi


if [[ -z $repo_dir ]]; then
  error_msg "Invalid repo dir form app!";
  exit 1;
fi

# Checkout repo
echo "";
echo "$seperator_line Checkout git branch [START] $seperator_line";
workspace=$OST_INFRA_WORKSPACE;
#cd $workspace;
echo "workspace: $workspace";
echo "repo_dir: $repo_dir";
builds_path=$workspace/rpm_builds;
mkdir -p $builds_path;
cd $builds_path;
repo_full_path=$builds_path/$repo_dir;
if [[  -z ${GITHUB_REPO} ]]
then
   GITHUB_REPO="${repo_url}/$repo_dir.git"
else
   rm -rf $repo_dir ;
fi

if [[ ! -d $repo_dir ]]; then
  git clone ${GITHUB_REPO};
fi
cd $repo_full_path ;
git stash ;
git pull --rebase ;
git fetch ;
git checkout $BRANCH_NAME ;
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
file_to_register=$builds_path/${APPLICATION};
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
        echo "No changes detected in git branch (${BRANCH_NAME}) since last build #: ${RPM_VERSION}"
        echo ""
    fi
else
    echo "Previous build file not found!"
fi

if [[ $APPLICATION == "ostInfra" ]]; then
    repo_full_path=${repo_full_path}/ost-infra
    echo "New repo_full_path: ${repo_full_path}"
fi

# Add build info with codebase
build_file="${repo_full_path}/.build";
touch $build_file;
echo "APPLICATION: $APPLICATION" >> $build_file;
echo "BRANCH_NAME: $BRANCH_NAME" >> $build_file;
echo "RPM_VERSION: $BUILD_NUM" >> $build_file;
echo "GIT_HEAD: $CURRENT_GIT_HEAD" >> $build_file;

echo "$seperator_line Checkout git branch [END] $seperator_line";


# Create RPM build
echo "";
echo "$seperator_line Upload RPM [START] $seperator_line";

base_dir="$APPLICATION-$BRANCH_NAME";

tar_name=simpletoken-${APPLICATION}-${BUILD_NUM}.tar.gz;
tar_file_path=$builds_path/$tar_name;
echo "tar_file_path: ${tar_file_path}"

exclude_string=""
for i in "${tar_exclusions[@]}"
do
   exclude_string="$exclude_string --exclude=$i"
done
cd $repo_full_path ; time tar $exclude_string  -czf $tar_file_path .;


gzip -t $builds_path/$tar_name;
if [[ $? -ne 0 ]]; then
   error_msg "Problem in Creating build tar file";
   rm -f $tar_name;
   exit 1;
else
   echo "Tar $tar_name created successfully";
fi

# Upload build
echo "Upload build: $tar_name";
temp=`aws s3 ls $s3_builds_path/$APPLICATION/$tar_name --profile ${AWS_PROFILE}  | grep $tar_name | head -1 | awk {'print $4'}`;
if [[ $temp =~ $tar_name ]]; then
  error_msg "Same tar version already present, please run again";
  exit 1;
else
  echo "Uploading tar file....";
  aws s3 cp $builds_path/$tar_name $s3_builds_path/$tar_name --profile ${AWS_PROFILE} ;
  build_upload_resp=$?;

  if [[ $build_upload_resp != 0  ]]; then
    error_msg "Build upload failed!!!";
    exit 1;
  fi
fi

# Register rpm version
#TODO are we using $file_to_register
echo "RPM_VERSION=$BUILD_NUM" > $file_to_register;
echo "APPLICATION=$APPLICATION" >> $file_to_register;
echo "GIT_HEAD=$CURRENT_GIT_HEAD" >> $file_to_register;

echo "";
echo "BRANCH_NAME: $BRANCH_NAME";
echo "";
echo "APPLICATION: $APPLICATION --- BRANCH_NAME: $BRANCH_NAME --- RPM_VERSION: $BUILD_NUM --- CURRENT_GIT_HEAD: $CURRENT_GIT_HEAD";
echo "";


echo "$seperator_line Upload RPM [END] $seperator_line";

echo "";
