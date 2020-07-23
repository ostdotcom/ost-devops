#!/usr/bin/env node

"use strict";

const shell = require('shelljs');
// shell.config.silent = true;
shell.config.fatal = true;


let resp = shell.exec('echo $HOME');
console.log("resp: %s", JSON.stringify(resp));

shell.env['RUN_NON_INTERACTIVE'] = 1;
shell.env['APPLICATION'] = 'web';
shell.env['ENV'] = 'staging';
shell.env['REGION'] = 'us';
shell.env['PLATFORM'] = '2';
shell.env['BRANCH_NAME'] = 'master';
let scriptPath = '/Users/bala/bala_folder_dump/simpletoken_devops/company';
shell.cd(scriptPath);
shell.exec(`./build_and_deploy.sh`);


console.log("\n\nDone!\n");



