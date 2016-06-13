// Copyright (c) Microsoft Corporation. All rights reserved.

var exec = require('child_process').exec,
    Q = require('q'),
    log = require('./log'),
    jsUtils = require('./jsUtils');

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

/**
 * @param {object} currentState
 * @param {object} previousState
 * @return {boolean}
 */
function shouldPrepare(currentState, previousState) {
    // We should prepare if we don't have any info on a previous prepare for the current platform, or if there is a
    // difference in the list of installed plugins, the merges files or the www files.
    if (!previousState) {
        return true;
    }

    var pluginsAreTheSame = jsUtils.compareObjects(currentState.pluginList, previousState.pluginList);
    var filesAreTheSame = jsUtils.compareObjects(currentState.files, previousState.files);

    return !pluginsAreTheSame || !filesAreTheSame;
}

module.exports.execCordovaPrepare = execCordovaPrepare;
module.exports.shouldPrepare = shouldPrepare;
