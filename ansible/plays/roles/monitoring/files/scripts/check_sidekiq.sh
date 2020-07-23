#!/usr/bin/env bash



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
	echo "Usage: $PROGNAME [ -w WarnValue -c CritValue  ] | [ -h]"
	echo ""
	echo "  -h  Show this page"
	echo "  -w  Warning value for messages in queue "
	echo "  -c  Critical value for messages in queue "
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
		*)
			echo "Unknown argument: $1"
			print_usage
			exit $STATE_UNKNOWN
			;;
	esac
	shift
done
# Check argument correctness:
if [ $WVALUE -eq 0 ] || [ $CVALUE -eq 0 ]  ; then
	echo "Invalid arguments"
	print_usage
	exit $STATE_UNKNOWN
fi

MESSAGE_COUNT=`su - deployer -c /bin/bash -lc 'cd /mnt/st-company/apps/api/current ;
rails runner  -e {{env}} "require \"sidekiq/api\"; stats=Sidekiq::Stats.new;puts(stats.enqueued)"'`;
SIDEKIQ_STATUS=`su - deployer -c /bin/bash -lc 'cd /mnt/st-company/apps/api/current ;
rails runner -e {{env}} "require \"sidekiq/api\";ps = Sidekiq::ProcessSet.new;puts(ps.size)"'`;

if [[ $SIDEKIQ_STATUS -gt 0 ]]
then
  FINAL_STATUS="OK SIDEKIQ is running";
else
  FINAL_STATUS="Critical :Sidekiq not running "
  RETURN_STATUS=$STATE_CRITICAL
fi
if [[ $MESSAGE_COUNT -gt $CVALUE ]]
then
  FINAL_STATUS="Critical : MESSAGE_COUNT: :$MESSAGE_COUNT   critical threshold :$CVALUE "
  RETURN_STATUS=$STATE_CRITICAL
elif [[ $MESSAGE_COUNT -gt $WVALUE ]]
then
   FINAL_STATUS="Warning: MESSAGE_COUNT:$MESSAGE_COUNT   warning threshold :$WVALUE "
   RETURN_STATUS=$STATE_WARNING
else
    FINAL_STATUS="OK - sidekiq looks good "
	  RETURN_STATUS=$STATE_OK
fi

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Return final status and exit code
#
echo $FINAL_STATUS
exit $RETURN_STATUS






