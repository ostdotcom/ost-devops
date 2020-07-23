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
	echo "  -w  Warning value for transactions in queue "
	echo "  -c  Critical value for transactions in queue"
	echo "  -q  pending/queued"

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
		-q)
			shift
			QVALUE=$1
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

IPC_FILE=`find /mnt/st-company/ -name geth.ipc `
if [[ -z "$IPC_FILE" ]]
then
  FINAL_STATUS="Cannot find ipc file in /mnt/st-company"
  RETURN_STATUS=$STATE_UNKNOWN
fi

COUNT=`geth attach  "$IPC_FILE"  --exec "txpool.status.$QVALUE"`
if [[ $COUNT -gt $CVALUE ]]
then
  FINAL_STATUS="Critical :  $QVALUE count:$COUNT   critical threshold :$CVALUE "
  RETURN_STATUS=$STATE_CRITICAL
elif [[ $QUEUED_COUNT -gt $WVALUE ]]
then
  FINAL_STATUS="Warning: $QVALUE count:$COUNT   warning threshold :$WVALUE "
   RETURN_STATUS=$STATE_WARNING
else
    FINAL_STATUS="OK - geth looks good "
	  RETURN_STATUS=$STATE_OK
fi

# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Return final status and exit code
#
echo $FINAL_STATUS
exit $RETURN_STATUS






