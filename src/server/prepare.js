// Copyright (c) Microsoft Corporation. All rights reserved.

var exec = require('child_process').exec,
    Q = require('q'),
    config = require('./config'),
    log = require('./log'),
    plugins = require('./plugins');

var preparedOnce;
var preparePromise;
var lastPlatform;

function prepare() {
    if (!preparePromise) {
        var d = Q.defer();

        preparePromise = d.promise;
        lastPlatform = config.platform;

        execCordovaPrepare().finally(function () {
            lastPlatform = null;
            preparePromise = null;
        }).then(function () {
            preparedOnce = true;
            plugins.initPlugins();
            d.resolve();
        });
    } else {
        if (config.platform !== lastPlatform) {
            // Sanity check to verify we never queue prepares for different platforms
            throw new Error('Unexpected request to prepare \'' + config.platform + '\' while prepare of \'' + lastPlatform + '\' still pending.');
        }
    }

    return preparePromise;
}

function waitOnPrepare() {
    // Caller doesn't want to continue until we've prepared at least once. If we already have, return immediately,
    // otherwise launch a prepare.
    return preparedOnce ? Q.when() : prepare();
}

function execCordovaPrepare() {
    var projectRoot;
    var platform;
    var deferred = Q.defer();

    try {
        projectRoot = config.projectRoot;
        platform = config.platform;
    } catch (error) {
        deferred.reject(error);
    }

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

module.exports.prepare = prepare;
module.exports.waitOnPrepare = waitOnPrepare;
module.exports.execCordovaPrepare = execCordovaPrepare;
