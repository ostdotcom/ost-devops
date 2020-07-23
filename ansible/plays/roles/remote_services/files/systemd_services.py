#!/usr/bin/env python3.6

import os
import json
import sys
import argparse
import string
import fileinput
import subprocess
import re
import random
from os import path
from jinja2 import Template
from jinja2 import Environment, FileSystemLoader

parser = argparse.ArgumentParser()
parser.add_argument('--action', required=True, choices=['activate', 'deactivate', 'remove'], help='Main action to perform')
parser.add_argument('--app-data-file', help='JSON file contains app data')
parser.add_argument("--identifierReq")

args = parser.parse_args()

print('args.action: ', args.action)

action = args.action
if args.app_data_file:
    file_exists = path.exists(args.app_data_file)
    if file_exists:
        with open(args.app_data_file, 'r') as f:
            app_data = json.load(f)
else:
    print ('Error: App data File missing  ')
    exit(1)
role = app_data['role']
server_type=None
if app_data.get('serverType'):
    server_type = app_data.get('serverType')

application = app_data['app']
identifierReq = app_data['identifierReq']

if app_data.get('jobs') :
  jobs_data=app_data['jobs']
else:
  jobs_data = {}
default_loc = app_data['jobLocation']
target_loc = app_data['systemdPath']

print('role: %s, server_type: %s, application: %s' % (role, server_type, application))

def get_service_file_name(application, name, id, group_id, has_timer):
    target_name = '%s_%s' % (application, ('cront' if has_timer == True else 'cron'))
    if group_id:
        target_name = '%s_%s' % (target_name, str(group_id))
    target_name = '%s_%s_%s' % (target_name, name, str(id))
    return target_name


def get_service_list(application, jobs_data):
    service_list = []
    if len(jobs_data) >0 :
        for job in jobs_data:
            identifier = job.get('identifier')
            if  identifierReq != True :
                identifier='1'
            if identifier:
                has_timer = True if job.get('timer') else False
                target_name = get_service_file_name(application, job['name'], identifier, job.get('group_id'), has_timer)
                job['target_name']=target_name
                src_service = '%s_systemd.service' % application
                job['common_data']={};
                job['common_data']['shared_path']=app_data['sharedPath']
                if job.get('is_workspace_cron'):
                    job['common_data']['exec_dir_location']=app_data['workspaceJobs']
                else :
                    job['common_data']['exec_dir_location']=app_data['currentPath']
                target_service = '%s.service' % target_name
                service_list.append({'src_file': src_service, 'target_file': target_service, 'job': job})
                if job.get('timer'):
                    target_timer = '%s.timer' % target_name
                    job['target_name']=target_name
                    service_list.append({'src_file': 'systemd.timer', 'target_file': target_timer, 'job': job})
            else:
                print ('Error: Failed, as there was no identifier with the cron jobs ')
                exit(1)
    return service_list


def enable_service(name):
    cmd = 'sudo systemctl enable %s' % name
    print('enable_service: "%s"' % cmd)
    subprocess.run(cmd, check=True, shell=True, stdout=subprocess.PIPE)

def disable_service(name):
    cmd = 'cd '+ target_loc + '; ls ' + name + '| xargs systemctl disable'
    print('disable_service: "%s"' % cmd)
    subprocess.getstatusoutput(cmd)

def stop_service(name):
    cmd = 'cd '+ target_loc + '; ls ' + name + '| xargs systemctl stop'
    print('stop_service: "%s"' % cmd)
    subprocess.getstatusoutput(cmd)

def delete_service(name):
    cmd = 'rm -f '+ target_loc + '/' + name
    print('delete_service: "%s"' % cmd)
    subprocess.getstatusoutput(cmd)


def copy_template(name, targetName, job):
    target_file = str(target_loc+'/'+targetName)
    file_loader = FileSystemLoader(default_loc)
    env = Environment(loader=file_loader)
    template = env.get_template(name)
    newfiledata = template.render(job=job)
    with open(target_file, 'w+') as wFile:
  	    wFile.write(newfiledata)

def get_file_path_for_exe(job):
    file_path = None;
    if(server_type == 'nodejs'):
        file_path = (job['common_data']['exec_dir_location']+'/'+job['template_params']['exec_file_path']).strip()

    if(file_path != None):
        file_exists = path.exists(file_path)
        if not file_exists:
            print("The executable doesn't exist for path: ", file_path)
            exit(1)

def validate_exec_paths(application, jobs_data):
    service_list = get_service_list(application, jobs_data)
    for ele in service_list:
        if ele['job']:
            get_file_path_for_exe(ele['job'])

def generate_services(role, server_type, application, jobs_data):
    result = []
    service_list = get_service_list(application, jobs_data)
    for ele in service_list:
        copy_template(ele['src_file'], ele['target_file'], ele['job'])
        enable_service(ele['target_file'])
        result.append(ele['job'])
    with open('generate_services_status.json', 'w') as outfile:
        json.dump(result, outfile, indent=2)
    if role == 'app' :
        serviceName= application+'.service'
        nginx_service = '%s-%s' % ('nginx', serviceName)
        if  server_type == 'nodejs' :
            nginx_service_exists = path.exists("%s/nginx-%s" % (default_loc, serviceName))
            if nginx_service_exists and not app_data.get('isSocketServer'):
              copy_template(nginx_service, nginx_service, None)
              enable_service(nginx_service)
        elif server_type == 'rails' :
            copy_template(nginx_service,serviceName,None)
            enable_service(serviceName)
        elif server_type == 'rabbit' :
            copy_template(nginx_service,nginx_service,None)
            enable_service(nginx_service)
        elif app_data.get('isPublicGethNode') :
            copy_template(nginx_service,nginx_service,None)
            enable_service(nginx_service)

        if path.exists("%s/%s" % (default_loc, serviceName)) :
            copy_template(serviceName,serviceName,None)
            enable_service(serviceName)


def check_and_deactivate(name, remove=False):
    cmd = 'ls '+ target_loc + '/' + name
    result = subprocess.getstatusoutput(cmd)
    status = False
    if result[0] == 0:
        stop_service(name)
        disable_service(name)
        if remove == True:
            delete_service(name)
        status = True
    else:
        print('Warning: No service present for name: ', name)
    return status

def deactivate_services(application, jobs_data, remove=False):
    result = []
    if len(jobs_data) > 0:
        service_list = get_service_list(application, jobs_data)
        for ele in service_list:
            status = check_and_deactivate(ele['target_file'], remove)
            debug_data = {'check_and_deactivate_status': status}
            ele['job']['debug_data'] = debug_data
            result.append(ele['job'])
        with open('deactivate_services_status.json', 'w') as outfile:
            json.dump(result, outfile, indent=2)
    else:
        name = '*%s*' % application
        check_and_deactivate(name, remove)

if action == 'activate':
    # Validate for cron exec paths
    validate_exec_paths(application, jobs_data)
    # Remove existing all cron type service files
    deactivate_services(('%s_cron' % application), [], True)
    # Generate new service files
    generate_services(role, server_type, application, jobs_data)
elif action == 'deactivate':
    # De-activate service files
    deactivate_services(application, jobs_data, False)
elif action == 'remove':
    # Remove all service files
    deactivate_services(application, jobs_data, True)
