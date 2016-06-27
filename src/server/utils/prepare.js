// Copyright (c) Microsoft Corporation. All rights reserved.

var exec = require('child_process').exec,
    Q = require('q'),
    log = require('./log');

/**
 * @param {string} projectRoot
 * @param {string} platform
 * @return {Promise}
 */
function execCordovaPrepare(projectRoot, platform) {
    var deferred = Q.defer();

    log.log('Preparing platform \'' + platform + '\'.');

    exec('cordova prepare ' + platform, {
        cwd: projectRoot
    }, function (err, stdout, stderr) {
        if (err) {
            deferred.reject(err || stderr);
        }

        deferred.resolve();
    });

    return deferred.promise;
}

module.exports.execCordovaPrepare = execCordovaPrepare;
