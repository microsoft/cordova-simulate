// Copyright (c) Microsoft Corporation. All rights reserved.

var exec = require('child_process').exec,
    log = require('./log'),
    utils = require('./jsUtils');

/**
 * @param {string} projectRoot
 * @param {string} platform
 * @return {Promise}
 */
function execCordovaPrepare(projectRoot, platform) {
    return utils.retryAsync(getExecCordovaPrepareImpl(projectRoot, platform));
}

function getExecCordovaPrepareImpl(projectRoot, platform) {
    return function () {
        return new Promise((resolve, reject) => {
            log.log('Preparing platform \'' + platform + '\'.');

            exec('cordova prepare ' + platform, {
                cwd: projectRoot
            }, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };
}

module.exports.execCordovaPrepare = execCordovaPrepare;
