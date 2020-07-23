#!/usr/bin/python3.6

import requests
import json
import re
import sys
import os, subprocess as sp, json
source = 'source /etc/profile'
dump = '/usr/bin/python -c "import os, json;print json.dumps(dict(os.environ))"'
pipe = sp.Popen(['/bin/bash', '-c', '%s && %s' %(source,dump)], stdout=sp.PIPE)
env = json.loads(pipe.stdout.read())
os.environ = env
critical_state=2
ok_state=0
warning_state=1
critical_state=2
unknown_state=3
os.system("source /etc/profile")
queue_data=requests.get('http://127.0.0.1:15672/api/queues/%2f/',auth=(str(os.environ.get('rmqUserName')),str(os.environ.get('rmqPassword'))))
queues=json.loads(queue_data.text)
queue_name=sys.argv[6]
warning=int(sys.argv[2])
critical=int(sys.argv[4])
found=False
for queue in queues:
	name = queue.get('name')
	pattern='.*'+queue_name+'.*'
	result=re.search(pattern, name)
	if result:
		messages = queue.get('messages_ready')
		consumers = queue.get('consumers')
		state = queue.get('state')
		durable = queue.get('durable')
		found=True
		if messages > critical:
			print(name+" exceeds critical threshold");
			exit(critical_state)
		elif messages > warning:
			print(name+" exceeds warning threshold");
			exit(warning_state)
		if 	consumers < 1 :
			print(name+" no consumers hence critical")
			exit(critical_state)
		if 	state != "running":
			print(name+" not in running state ")
			exit(critical_state)
		if not 	durable :
			print(name+" not durable que should be durable ")
			exit(critical_state)
if found :
	print("rabbit queue looks ok")
	exit(ok_state)
else :
	print("no  queue found ")
	exit(unknown_state)
