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

        var platform = config.platform;
        log.log('Preparing platform \'' + platform + '\'.');

        lastPlatform = platform;

        var projectRoot;
        try {
            projectRoot = config.projectRoot;
        } catch (error) {
            return Q.reject(error);
        }

        exec('cordova prepare ' + platform, {
            cwd: projectRoot
        }, function (err, stdout, stderr) {
            lastPlatform = null;
            preparePromise = null;
            if (err) {
                d.reject(stderr || err);
            } else {
                preparedOnce = true;
                plugins.initPlugins();
                d.resolve();
            }
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

module.exports.prepare = prepare;
module.exports.waitOnPrepare = waitOnPrepare;
