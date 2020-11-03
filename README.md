#### Local workstation setup

* Set following ENV variables.
```bash
export OST_INFRA_AWS_ACCESS_KEY='<AWS IAM access key>'
export OST_INFRA_AWS_KEY_SECRET='<AWS IAM key secret>'
export OST_INFRA_AWS_REGION='eu-west-1'
export OST_INFRA_AWS_ACCOUNT_ID=401473291306
export OST_INFRA_AWS_KMS_KEY_ID='<AWS KMS key id>'

export OST_INFRA_MYSQL_HOST='localhost'
export OST_INFRA_MYSQL_USER='infra_user'
export OST_INFRA_MYSQL_PASSWORD='<DB Password>'
export OST_INFRA_MYSQL_PORT=3308

export OST_INFRA_MYSQL_CONNECTION_POOL_SIZE=5
export OST_INFRA_WORKSPACE='<Workspace directory path>'
```

* Create SSH tunnel to connect to ost infra DB.
```bash
ssh -o ExitOnForwardFailure=yes -L 3308:<MySQL Host>:3306 99.80.111.137 -N -f
```

#### **Create and update platform configuration data**

* Create platform configuration if not created. [p1]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/platform.js --create --platform-id {platformId} --aws-account-id {accountId} --aws-region {region} --env {env} --sub-env {sub_env}
```

* Get platform configuration data in a file (If your system responds to `open` command, then the file will open in editor else you have to copy the file path and open it in respective editor). [p2]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/platform.js --get --platform-id {platformId} --env {env} --sub-env {sub_env}
```

* Update platform configuration data from the file. [p3]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/platform.js --update --platform-id {platformId} --env {env} --sub-env {sub_env}
```

#### **Create and update application configuration data**

* Create application configuration if not created yet. [ac1]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/app_config.js --create --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name}
```

* Get application configuration data in a file (If your system responds to `open` command, then the file will open in editor else you have to copy the file path and open it in respective editor). [ac2]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/app_config.js --get --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name}
```
* Update application configuration data from the file. [ac3]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/app_config.js --update --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name}
```

#### **EC2 instances for applications**

* Create application stack from template (defined in `ost-infra/templates/app_setup/production/app_stack_template.json`) [as1]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/app_setup.js --create-app-stack --platform-id {platformId} --env {env} --sub-env {sub_env}  --app {app_name}
```

* Create multiple instances of single app. [as2]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/app_setup.js --create-app-stack --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name} --app-name {app_name} --app-type {app/cron} --app-count {number_of_servers}
```

#### **Run app Configuration changes from Ansible**

* Setup application server. [a1]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/ansible.js --app-setup --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name}
```
* Create build for application [a2]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/ansible.js --build --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name} --branch-name {branch_name}
``` 

* Deploy build on application servers. [a3]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/ansible.js --deploy --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name} --build-number {build_number}   
```

* Activate systemd services on servers. [a4]
```bash
cd "<app root directory >/ost-infra"
node executables/utils/ansible.js --activate-services --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name}
```


#### Example: Steps to create new app from scratch.

* Create platform config if not exists. Follow steps mentioned in `p1, p2 and p3`.
* Create application configuration first. Follow steps mentioned in `ac1, ac2 and ac3`.
* Add EC2 instance template for application in file `ost-infra/templates/app_setup/production/app_stack_template.json`.
* Add cron job configs (if any) to file `ost-infra/config/ansible/inventory_configs.js`.
* Create AWS config file for the application at the following location `ost-infra/config/aws/${env}/${app_name}.json`.
* Create application constant JS file at the following location `config/aws/{app_name}.js`.
* Create EC2 instances for application. Run Step `as1`.
* Setup EC2 instances for application. Run Step `a1`.
* Create build for application. Run Step `a2`.
* Activate systemd services on servers. Run Step `a4`.
* Deploy build to application servers. Run Step `a3`.
 
 