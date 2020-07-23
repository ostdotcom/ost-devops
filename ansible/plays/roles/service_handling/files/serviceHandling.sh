#!/usr/bin/env bash

usage='./serviceHandling.sh --app <required if name not mentioned> --server-type <Server Type> --role <Optional: Role name> --name <Optional: Service full/partial name> --action <start/restart/stop> --stop-cron-file-path <To fix stuck cron> --force-restart <Force restart services in case of nginx-conf-update> --help'

while [ $# -gt 0 ]; do
    key=$1
    case ${key} in
        --app)
            shift
            export APPLICATION=$1
            ;;
        --role)
            shift
            export ROLE=$1
            ;;
        --name)
            shift
            export NAME=$1
            ;;
        --action)
            shift
            export ACTION=$1
            ;;
        --server-type)
            shift
            export TYPE=$1
            ;;
        --force-restart)
            shift
            export FORCE_RESTART=$1
            ;;
        --current-path)
            shift
            export CURRENT_PATH=$1
            ;;
        --stop-cron-file-path)
           shift
           export STOP_CRON_FILE_PATH=$1
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

if [[ (-z "${APPLICATION}") || (-z "${ROLE}") || (-z "${ACTION}") ]]; then
    echo "Invalid params \nUsage: $usage"
fi


export MACHINE_IP=${PA_DEVOPS_IP_ADDRESS}
export APP_NAME=${PA_DEVOPS_APP_NAME}
export UNIQUE_ENV_ID=${PA_DEVOPS_ENV_ID}

EMAIL_NO_LOGFILE_LINES=50
EMAIL_SUBJECT_TAG="AppRestart: ${APP_NAME}:${UNIQUE_ENV_ID}::"
EMAIL_SUBSCRIBERS="backend@ost.com"

function send_email(){
    local subject=$1
    local body=$2

    local ts=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[${ts}] ${subject}"
    echo "[${ts}] ${body}"

    mail_body_file="temp.mail"
    touch ${mail_body_file}
    echo "Date: ${ts}" > ${mail_body_file}
    echo "IP ADDRESS: ${MACHINE_IP}" >> ${mail_body_file}
    echo "" >> ${mail_body_file}
    echo "Last ${EMAIL_NO_LOGFILE_LINES} lines: " >> ${mail_body_file}
    if [[ ! -z ${body} ]]; then
        echo "${body}" >> ${mail_body_file}
    fi
    cat ${mail_body_file} | mail -s "${EMAIL_SUBJECT_TAG} ${subject}" "${EMAIL_SUBSCRIBERS}"
    rm -f ${mail_body_file}
}

if [[  -z ${FORCE_RESTART} ]]; then
     FORCE_RESTART=false;
fi


pm2_enabled=false
if [[ ${APPLICATION} =~ (saas|ostView) ]]; then
    pm2_enabled=true
fi

if [[ ${ACTION} == "stop" ]]; then
    APP_ACTION="stop"
elif [[ ${FORCE_RESTART} == true || ${TYPE} == 'rails' || ${pm2_enabled} == false ]]; then
    APP_ACTION="restart"
else
    APP_ACTION="start"
fi

CRON_DB_IDENTIFIERS=()
FAILED_SERVICES=()

echo ""
echo "APPLICATION: $APPLICATION"
echo "ROLE: $ROLE"
echo "NAME: $NAME"
echo "ACTION: $ACTION"
echo "TYPE: $TYPE"
echo "FORCE_RESTART: $FORCE_RESTART"
echo "APPLICATION_ACTION: $APP_ACTION"
echo ""

function markStopInDb(){

    identifiers=`echo "${CRON_DB_IDENTIFIERS[@]}"`

    if [[ -z ${identifiers} ]]; then
        return 0 ;
    fi

    cd ${CURRENT_PATH};
    /bin/node ${STOP_CRON_FILE_PATH} --stop-stuck-cron --identifiers "${identifiers}"
    if [[ $? -ne 0 ]]; then
        send_email "Fix stuck cron failed" "Identifiers: ${identifiers}"
    fi
}

function serviceHandling(){
    LOCAL_ACTION=$1
    REGEX=$2
    COLLECT_IDENTIFIERS=$3

    for  i in `ls ${REGEX} 2>/dev/null`
    do
        service_name=`basename $i`
        cmd="systemctl ${LOCAL_ACTION} ${service_name}"
        echo "INFO: ${cmd}"

        ${cmd}
        if [[ $? -ne 0 ]]; then
            FAILED_SERVICES+=(${service_name})
        fi

        # Check stuck crons and fix it
        if [[ ${COLLECT_IDENTIFIERS} == "true" ]]; then
            identifier=`echo $service_name |awk -F '.' '{print $1}'|awk -F '_' '{print $NF}'`
            CRON_DB_IDENTIFIERS+=(${identifier})
        fi
    done
}

#################################### MAIN ####################################

sudo systemctl daemon-reload
sudo systemctl reset-failed

if [[ -z ${NAME} ]]; then
    # App start/restart handling
    serviceHandling ${APP_ACTION} "/etc/systemd/system/nginx-${APPLICATION}.*"
    serviceHandling ${APP_ACTION} "/etc/systemd/system/${APPLICATION}.*"
    if [[ ${APP_ACTION} != "stop" && ${pm2_enabled} == true && ${FORCE_RESTART} == false ]]; then
        serviceHandling reload "/etc/systemd/system/${APPLICATION}.service"
    fi

    # Cron start/restart handling
    if [[ -f "${STOP_CRON_FILE_PATH}" ]]; then
        serviceHandling stop  "/etc/systemd/system/${APPLICATION}_cront_*.timer"
        serviceHandling stop  "/etc/systemd/system/${APPLICATION}_cron*.service" true
        markStopInDb
    fi

    serviceHandling ${ACTION} "/etc/systemd/system/${APPLICATION}_cront_*.timer"
    serviceHandling ${ACTION} "/etc/systemd/system/${APPLICATION}_cron_*.service"
    serviceHandling ${ACTION} "/etc/init.d/*${APPLICATION}*"
else
    if [[ -f "${STOP_CRON_FILE_PATH}" ]]; then
        serviceHandling stop  "/etc/systemd/system/*${NAME}*.timer"
        serviceHandling stop  "/etc/systemd/system/*${NAME}*.service" true
        markStopInDb
    fi

    serviceHandling ${ACTION} "/etc/systemd/system/*${NAME}*"
    serviceHandling ${ACTION} "/etc/init.d/*${NAME}*"
fi

# If failed services not empty
if [[ ${#FAILED_SERVICES[@]} > 0 ]]; then
    mail_subject="${ACTION} failed for following services"
    mail_body=`echo "Services: ${FAILED_SERVICES[@]}"`
    send_email "${mail_subject}" "${mail_body}"
    echo "${EMAIL_SUBJECT_TAG}: ${mail_subject}"
    echo "${EMAIL_SUBJECT_TAG}: ${mail_body}"
fi

