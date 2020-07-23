* Create VPC
* Create subnets 
* Associate subnets in route tables 
* Create security groups 
* create IAM user -- create ops user ,policies for assests upload and logs download and builds download 
* create s3 buckets 


#Files to be changed 
* ost-infra templates (ost-infra/templates/app_setup/staging/app_stack_template.json)
* ost-infra constants file (ost-infra/config/constants.js)
    * functions: declare application name (ost-infra/config/constants.js)
                 appList
                 isBuildDeployRequired
                 isSystemdActivationRequired
                 appsServerList
                 interface function if required 
* create Js file ost-infra/config/aws/{{application}}.js
* create json file with subnets security groups etc ost-infra/config/aws/staging/{{application}}.json
* create group_vars for application -- ansible/inventories/{{env}}/group_vars
* make changes in build.sh to add appliction -- ansible/build/build.sh
* make changes in common role templates : (ansible/plays/roles/common/templates/systemd) add  systemd app service 
                                          (ansible/plays/roles/common/templates/common_functions.sh.j2) make changes in common_functions is_valid_app etc

* create platform if a new platform. (./platform.js --create  --platform-id {{platform-id}} --aws-account-id {{aws-account-id}} --aws-region  {{aws-region}} --env {{env}} --sub-env {{sub-env}})
* create app config  ./app_config.js --create --app saasApi --platform-id 4 --sub-env main 
  
* create kms keys -- infra ,config and user keys ,rds etc if needed 
