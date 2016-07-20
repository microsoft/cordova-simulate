// Copyright (c) Microsoft Corporation. All rights reserved.

var exec = require('child_process').exec,
    Q = require('q'),
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
        var deferred = Q.defer();

        log.log('Preparing platform \'' + platform + '\'.');

        exec('cordova prepare ' + platform, {
            cwd: projectRoot
        }, function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            }
        });

        return deferred.promise;
    };
}

module.exports.execCordovaPrepare = execCordovaPrepare;
