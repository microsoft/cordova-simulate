// Copyright (c) Microsoft Corporation. All rights reserved.

var chalk = require('chalk');

function log(msg) {
    console.log(chalk.cyan('SIM: ' + msg));
}

function error(error) {
    error = error.stack || error.toString();
    if (error.toUpperCase().indexOf('ERROR: ') === 0) {
        error = error.slice(7);
    }
    console.log(chalk.red.bold('SIM ERROR: ' + error));
}

module.exports = {
    log: log,
    error: error
};
