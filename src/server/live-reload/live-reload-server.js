// Copyright (c) Microsoft Corporation. All rights reserved.

var config = require('../config');
var ncp = require('ncp');
var path = require('path');
var prepare = require('../prepare');
var Q = require('q');
var telemetry = require('../telemetry-helper');
var Watcher = require('./watcher').Watcher;

var liveReloadEvents = {
    CAN_REFRESH: 'lr-can-refresh',
    REFRESH_FILE: 'lr-refresh-file',
    FULL_RELOAD: 'lr-full-reload'
};

var socket;
var watcher;

function onFileChanged(fileRelativePath, filePathFromProjectRoot) {
    fileRelativePath = fileRelativePath.replace(/\\/g, '/');

    // Query the client to determine if this file can be refreshed without reloading the page.
    var canRefreshDeferred = Q.defer();

    function canRefreshHandler(data) {
        if (data.fileRelativePath === fileRelativePath) {
            socket.removeListener(liveReloadEvents.CAN_REFRESH, canRefreshHandler);
            canRefreshDeferred.resolve(data.canRefresh);
        }
    }

    socket.on(liveReloadEvents.CAN_REFRESH, canRefreshHandler);
    socket.emit(liveReloadEvents.CAN_REFRESH, { fileRelativePath: fileRelativePath });

    var canRefreshFile;

    canRefreshDeferred.promise
        .then(function (canRefresh) {
            canRefreshFile = canRefresh;

            // Propagate the change to the served platform folder (either via "cordova prepare", or by copying the file directly).
            if (canRefreshFile) {
                if (config.forcePrepare) {
                    // Sometimes, especially on Windows, prepare will fail because the modified file is locked for a short duration after modification, so we try to prepare twice.
                    return retryAsync(prepare.execCordovaPrepare, 2);
                }

                var destAbsolutePath = path.join(config.platformRoot, fileRelativePath);

                return copyFile(filePathFromProjectRoot, destAbsolutePath);

            } else {
                // A full reload is needed, so the simulation server will do a prepare - no need to prepare again here.
                return Q.resolve();
            }
        })
        // The delay is needed as a workaround on Windows, because shortly after copying the file, it is typically locked by the Firewall and can't be correctly sent by the server.
        .delay(125).then(function () {
            var props = { fileType: path.extname(fileRelativePath) };

            if (canRefreshFile) {
                props.reloadType = 'refresh';
                socket.emit(liveReloadEvents.REFRESH_FILE, { fileRelativePath: fileRelativePath });
            } else {
                props.reloadType = 'full-reload';
                socket.emit(liveReloadEvents.FULL_RELOAD);
            }

            telemetry.sendTelemetry('live-reload', props);
        }).done();
}

function copyFile(src, dest) {
    return Q.nfcall(ncp, src, dest);
}

function retryAsync(promiseFunc, maxTries, delay, iteration) {
    delay = delay || 100;
    iteration = iteration || 1;

    return promiseFunc().catch(function (err) {
        if (iteration < maxTries) {
            return Q.delay(delay).then(function () {
                return retryAsync(promiseFunc, maxTries, delay, iteration + 1);
            });
        }

        return Q.reject(err);
    });
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
