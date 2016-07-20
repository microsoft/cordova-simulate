// Copyright (c) Microsoft Corporation. All rights reserved.

var config = require('../config');
var ncp = require('ncp');
var path = require('path');
var prepare = require('../prepare');
var Q = require('q');
var telemetry = require('../telemetry-helper');
var Watcher = require('./watcher').Watcher;

var socket;
var watcher;

function onFileChanged(fileRelativePath, parentDir) {
    fileRelativePath = fileRelativePath.replace(/\\/g, '/');

    // Propagate the change to the served platform folder (either via "cordova prepare", or by copying the file
    // directly).
    var propagateChangePromise;

    if (config.forcePrepare) {
        // Sometimes, especially on Windows, prepare will fail because the modified file is locked for a short duration
        // after modification, so we try to prepare twice.
        propagateChangePromise = prepare.prepare().then(function () {
            return false;
        });
    } else {
        var sourceAbsolutePath = path.join(config.projectRoot, parentDir, fileRelativePath);
        var destAbsolutePath = path.join(config.platformRoot, fileRelativePath);

        propagateChangePromise = copyFile(sourceAbsolutePath, destAbsolutePath).then(function () {
            return true;
        });
    }

    // Notify app-host. The delay is needed as a workaround on Windows, because shortly after copying the file, it is
    // typically locked by the Firewall and can't be correctly sent by the server.
    propagateChangePromise.delay(125).then(function (shouldUpdateModifTime) {
        var props = { fileType: path.extname(fileRelativePath) };

        if (shouldUpdateModifTime) {
            prepare.updateTimeStampForFile(fileRelativePath, parentDir);
        }

        socket.emit('lr-file-changed', { fileRelativePath: fileRelativePath });
        telemetry.sendTelemetry('live-reload', props);
    }).done();
}

function copyFile(src, dest) {
    return Q.nfcall(ncp, src, dest);
}

module.exports.init = function (sock) {
    if (!watcher) {
        watcher = new Watcher(onFileChanged);
        watcher.startWatching();
    }

    socket = sock;
    socket.emit('start-live-reload');
};
module.exports.stop = function () {
    if (watcher) {
        watcher.stopWatching();
    }
};
