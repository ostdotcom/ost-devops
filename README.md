#**STEPS FOR APP ADDITION** 

*  Create platform if not created add domain in the platform 
   **./platform.js --create --platform-id {platformId} --aws-account-id {accountId} --aws-region {region} --env {env} --sub-env {sub_env}**
*  Create app config add subDomain 
   **./app_config.js --create  --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name}**
*  Add machine configs in app_setup template 
*  Add crons if any to inventory config 
*  Create json file for the app under config/aws/${env}/${app_name}.json
*  Create App js file under config/aws 
*  Run 
      **./app_setup.js --create-app-stack --platform-id {platformId} --env {env} --sub-env {sub_env}  --app {app_name}** 
      This will create the machines as mentioned in the app template with security group etc as mentioned in the config  .
* Run 
      **./ansible.js --app-setup   --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name}** 
    This will create the directory structure copy scripts and install nagios client   
      
* Run 
      **./ansible.js --build -b {branch}   --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name}** 
  This will create a build encrypt it and upload it to S3 .  

* Run 
      **./ansible.js --activate-services   --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name}** 
   This will copy and enable systemd services as mentioned in the inventory_config .

* Run 
          **./ansible.js --deploy -n {rpmNumber}   --platform-id {platformId} --env {env} --sub-env {sub_env} --app {app_name}** 
      This will download and deploy build on the machine .
      
#**For PrivateOpsApi Additional Steps**

* For PrivateOpsApi copy the keystore from existing machine to s3 and then download the same on new machine from s3 .
   For Uploading to s3 first encrypt through kms using the below command 
   **Encryption** 
   **aws-encryption-cli --encrypt --input secret.txt \
                        --master-keys key=$keyID \
                        --encryption-context purpose=test \
                        --metadata-output ~/metadata \
                        --output**       
* Create a zip using the below command and save the password in app configs 
   **zip -e target.zip source_dir/**

* Upload using 
    **aws s3 cp --recursive {source} s3://{target_path}  --profile {profile name}**
    profile param is not necessary if iam role is attached to the ec2 instance 
     
* Download and decrypt 
    **aws s3 cp --recursive s3://{source} {target_path}  --profile {profile name}**
       profile param is not necessary if iam role is attached to the ec2 instance 
   
   **Decryption**  
   **aws-encryption-cli --decrypt --input secret.txt.encrypted \
                         --encryption-context purpose=test \
                         --metadata-output ~/metadata \
                         --output .**
   


 
 
 