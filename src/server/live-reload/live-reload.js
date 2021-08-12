// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs');
var path = require('path');
var Watcher = require('./watcher').Watcher;
var log = require('../utils/log');
var utils = require('../utils/jsUtils');

/**
 * @constructor
 */
function LiveReload(project, telemetry, forcePrepare, reloadDelay) {
    this._DELAY_STEP = 50;

    this._project = project;
    this._telemetry = telemetry;
    this._forcePrepare = forcePrepare;
    this._watcher = null;
    this._socket = null;
    this._reloadDelay = reloadDelay;
    this._filesLocks = new Map();
}

LiveReload.prototype.start = function (socket) {
    if (!this._watcher) {
        this._watcher = new Watcher(this._project.projectRoot, this._project.platform);
        this._watcher.on('file-changed', this._onFileChanged.bind(this));
        this._watcher.startWatching();
    }

    this._socket = socket;
    this._socket.emit('start-live-reload');
};

LiveReload.prototype.stop = function () {
    if (this._watcher) {
        this._watcher.stopWatching();
        this._watcher = null;
    }
};

/**
 * File change callback. Propagate the change to the served platform folder, either via "cordova prepare",
 * or by copying the file directly.
 * @param {string} fileRelativePath
 * @param {string} parentDir
 * @private
 */
LiveReload.prototype._onFileChanged = function (fileRelativePath, parentDir) {
    fileRelativePath = fileRelativePath.replace(/\\/g, '/');

    var propagateChangePromise;

    if (this._forcePrepare) {
        // Sometimes, especially on Windows, prepare will fail because the modified file is locked for a short duration
        // after modification, so we try to prepare twice.
        propagateChangePromise = this._project.prepare()
            .then(function () {
                return false;
            });
    } else {
        var sourceAbsolutePath = path.join(this._project.projectRoot, parentDir, fileRelativePath);
        var destAbsolutePath = path.join(this._project.platformRoot, fileRelativePath);

        if (!fs.existsSync(sourceAbsolutePath)) {
            propagateChangePromise = deleteFile(destAbsolutePath)
                .then(function () {
                    return false;
                });
        } else {
            propagateChangePromise = this._copyFileWithDelay(sourceAbsolutePath, destAbsolutePath, this._reloadDelay)
                .then(function () {
                    return true;
                });
        }
    }

    // Notify app-host. The delay is needed as a workaround on Windows, because shortly after copying the file, it is
    // typically locked by the Firewall and can't be correctly sent by the server.
    propagateChangePromise.then(() => utils.delay(this._reloadDelay))
        .then(function (shouldUpdateModifTime) {
            var props = { fileType: path.extname(fileRelativePath) };

            if (shouldUpdateModifTime) {
                this._project.updateTimeStampForFile(fileRelativePath, parentDir);
            }

            this._socket.emit('lr-file-changed', { fileRelativePath: fileRelativePath });
            this._telemetry.sendTelemetry('live-reload', props);
        }.bind(this))
        .catch(function (err) {
            // Fail gracefully if live reload fails for some reason
            log.warning('Error in live reload processing changed file: ' + utils.stripErrorColon(err));
        });
};

LiveReload.prototype._copyFileWithDelay = function (src, dest, delay) {
    return this._retryAsyncLockIteration(
        () => {
            return utils.delay(delay)
                .then(copyFile(src, dest))
                .finally(() => {
                    this._filesLocks.delete(dest);
                });
        },
        this._DELAY_STEP,
        dest,
        (delay / this._DELAY_STEP) * 4
    ).catch(err => {
        this._filesLocks.delete(dest);
        throw err;
    });
};

LiveReload.prototype._retryAsyncLockIteration = function (operation, delay, key, attempts) {
    if (!this._filesLocks.has(key)) {
        this._filesLocks.set(key, true);
        return operation();
    } else if (attempts <= 0) {
        return Promise.reject('Attempts to catch the lock have exceeded');
    } else {
        return utils.delay(delay)
            .then(() => this._retryAsyncLockIteration(operation, delay, key, --attempts));
    }
};

function copyFile(src, dest) {
    return Promise.resolve(utils.copyFileRecursiveSync(src, dest));
}

function deleteFile(file) {
    return fs.promises.unlink(file);
}

module.exports = LiveReload;
