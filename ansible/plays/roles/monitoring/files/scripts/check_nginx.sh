#!/bin/sh
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Nagios return codes
#
STATE_OK=0
STATE_WARNING=1
STATE_CRITICAL=2
STATE_UNKNOWN=3

PROGNAME=$(basename $0)

print_usage() {
	echo ""
	echo "$PROGNAME"
	echo ""
	echo "Usage: $PROGNAME [ -w WarnValue -c CritValue -q QueueName ] | [ -h]"
	echo ""
	echo "  -h  Show this page"
	echo "  -w  Warning value for 5xx "
	echo "  -c  Critical value for 5xx"
	echo "  -t  time in minutes "

	echo ""
}

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Parse parameters
#
# Make sure the correct number of command line arguments have been supplied
if [ $# -lt 3 ]; then
	echo "Insufficient arguments"
	print_usage
	exit $STATE_UNKNOWN
fi
# Grab the command line arguments
WVALUE=0
CVALUE=0
while [ $# -gt 0 ]; do
	case "$1" in
		-h)
			print_usage
			exit $STATE_OK
			;;
		-w)
			shift
			WVALUE=$1
			;;
		-c)
			shift
			CVALUE=$1
			;;
		-t)
			shift
			TIME=$1
			;;
		-s)
		  shift
			STATUS_TYPE=$1
			;;
		 -a)
		  shift
			APPLICATION_TYPE=$1
			;;
		*)
			echo "Unknown argument: $1"
			print_usage
			exit $STATE_UNKNOWN
			;;
	esac
	shift
done
# Check argument correctness:
if [ $WVALUE -eq 0 ] || [ $CVALUE -eq 0 ] || [ -z $TIME ] ; then
	echo "Invalid arguments"
	print_usage
	exit $STATE_UNKNOWN
fi
export start_time=`date +"%s"`
OLDDATE=`date --date "-$TIME min" --iso-8601=minutes|awk -F'+' '{print $1}'`
NOWDATE=`date --iso-8601=minutes|awk -F'+' '{print $1}'`
if [[ ! -f "/mnt/logs/nginx/access-${APPLICATION_TYPE}.log" ]]
then
  FINAL_STATUS="nginx file doesnt exist"
	RETURN_STATUS=$STATE_OK
	echo "$FINAL_STATUS"
	exit $RETURN_STATUS
fi
# Count all request exclude elb requests
if [[ STATUS == "..." ]]
then
  COUNT=`awk "/$OLDDATE/, /$NOWDATE/" /mnt/logs/nginx/access-*${APPLICATION_TYPE}.log|grep -v 'ELB-HealthChecker'| grep -w "STATUS=\"${STATUS_TYPE}\""|wc -l`
else
# Count for all other requests like 4xx 5xx 3xx include elb counts also
  COUNT=`awk "/$OLDDATE/, /$NOWDATE/" /mnt/logs/nginx/access-*${APPLICATION_TYPE}.log| grep -w "STATUS=\"${STATUS_TYPE}\""|wc -l`
fi
if [[ $COUNT -gt $CVALUE ]]
then
   FINAL_STATUS="Critical: $COUNT ${STATUS_TYPE} messages limit $CVALUE "
   RETURN_STATUS=$STATE_CRITICAL
elif [[ $COUNT -gt $WVALUE ]]
then
  FINAL_STATUS="Warning:  $COUNT ${STATUS_TYPE} messages limit $WVALUE "
  RETURN_STATUS=$STATE_WARNING
else
    FINAL_STATUS="OK -COUNT:${COUNT} nginx looks good"
	  RETURN_STATUS=$STATE_OK
fi

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Return final status and exit code
#
export end_time=`date +"%s"`
export TIME_DIFF=`expr $end_time - $start_time`
echo "$FINAL_STATUS time_taken:${TIME_DIFF}"
exit $RETURN_STATUS






