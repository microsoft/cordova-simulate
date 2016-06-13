// Copyright (c) Microsoft Corporation. All rights reserved.

var config = require('./config'),
    exec = require('child_process').exec,
    fs = require('fs'),
    glob = require('glob'),
    jsUtils = require('./jsUtils'),
    log = require('./log'),
    path = require('path'),
    plugins = require('./plugins'),
    Q = require('q');

var previousPrepareStates = {};
var preparePromise;
var lastPlatform;

/**
 * Prepares the project and initializes the simulation plugin list.
 *
 * @param {Object=} currentState (Optional) The current state of the project for caching purposes.
 */
function prepare() {
    if (!preparePromise) {
        var d = Q.defer();
        var currentProjectState;

        preparePromise = d.promise;
        lastPlatform = config.platform;

        getProjectState().then(function (currentState) {
            currentProjectState = currentState;

            if (shouldPrepare(currentProjectState)) {
                return execCordovaPrepare().then(function () {
                    return true;
                });
            }

            return Q(false);
        }).then(function (didPrepare) {
            if (didPrepare || shouldInitPlugins(currentProjectState)) {
                saveProjectState(currentProjectState);
                plugins.initPlugins();
            }

            d.resolve();
        }).catch(function (err) {
            d.reject(err);
        }).finally(function () {
            lastPlatform = null;
            preparePromise = null;
        });
    } else {
        if (config.platform !== lastPlatform) {
            // Sanity check to verify we never queue prepares for different platforms
            throw new Error('Unexpected request to prepare \'' + config.platform + '\' while prepare of \'' + lastPlatform + '\' still pending.');
        }
    }

    return preparePromise;
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

function shouldPrepare(currentState) {
    // We should prepare if we don't have any info on a previous prepare for the current platform, or if there is a
    // difference in the list of installed plugins, the merges files or the www files.
    var currentPlatform = config.platform;
    var previousState = previousPrepareStates[currentPlatform];

    if (!previousState) {
        return true;
    }

    currentState = currentState || getProjectState();

    var pluginsAreTheSame = jsUtils.compareObjects(currentState.pluginList, previousState.pluginList);
    var filesAreTheSame = jsUtils.compareObjects(currentState.files, previousState.files);

    return !pluginsAreTheSame || !filesAreTheSame;
}

function shouldInitPlugins(currentState) {
    // We should init plugins if we don't have any info on a previous prepare for the current platform, or if there is
    // a difference in the list of installed plugins or debug-host handlers.
    var currentPlatform = config.platform;
    var previousState = previousPrepareStates[currentPlatform];

    if (!previousState) {
        return true;
    }

    currentState = currentState || getProjectState();

    // Use JSON stringification to compare states. This works because a state is an object that only contains
    // serializable values, and because the glob module, which is used to read directories recursively, is
    // deterministic in the order of the files it returns.
    var pluginsAreTheSame = jsUtils.compareObjects(currentState.pluginList, previousState.pluginList);
    var debugHandlersAreTheSame = jsUtils.compareObjects(currentState.debugHostHandlers, previousState.debugHostHandlers);

    return !pluginsAreTheSame || !debugHandlersAreTheSame;
}

function getProjectState() {
    var currentPlatform = config.platform;
    var newState = {};

    return Q().then(function () {
        // Get the list of plugins for the current platform.
        var pluginsJsonPath = path.join(config.projectRoot, 'plugins', currentPlatform + '.json');
        return Q.nfcall(fs.readFile, pluginsJsonPath);
    }).then(function (fileContent) {
        var installedPlugins = {};

        try {
            installedPlugins = Object.keys(JSON.parse(fileContent.toString())['installed_plugins'] || {});
        } catch (err) {
            // For some reason, it was not possible to determine which plugins are installed for the current platform, so
            // use a dummy value to indicate a "bad state".
            installedPlugins = ['__unknown__'];
        }

        newState.pluginList = installedPlugins;
    }).then(function () {
        // Get the modification times for project files.
        var wwwRoot = path.join(config.projectRoot, 'www');
        var mergesRoot = path.join(config.projectRoot, 'merges', config.platform);

        return Q.all([getMtimeForFiles(wwwRoot), getMtimeForFiles(mergesRoot)]);
    }).spread(function (wwwFiles, mergesFiles) {
        var files = {};

        files.www = wwwFiles || {};
        files.merges = mergesFiles || {};
        newState.files = files;

        // Get information about current debug-host handlers.
        newState.debugHostHandlers = config.debugHostHandlers || [];

        // Return the new state.
        return newState;
    });
}

function saveProjectState(currentState) {
    previousPrepareStates[config.platform] = currentState || getProjectState();
}

function updateTimeStampForFile(fileRelativePath, parentDir) {
    var previousPlatformState = previousPrepareStates[config.platform];
    var fileAbsolutePath = path.join(config.projectRoot, parentDir, fileRelativePath);

    if (previousPlatformState && previousPlatformState.files && previousPlatformState.files[parentDir] && previousPlatformState.files[parentDir][fileAbsolutePath]) {
        previousPlatformState.files[parentDir][fileAbsolutePath] = new Date(fs.statSync(fileAbsolutePath).mtime).getTime();
    }
}

function getMtimeForFiles(dir) {
    var files = {};

    Q.nfcall(glob, '**/*', { cwd: dir }).then(function (rawFiles) {
        var filePromises = [];

        rawFiles.forEach(function (file) {
            file = path.join(dir, file);

            filePromises.push(Q.nfcall(fs.stat, file).then(function (stats) {
                files[file] = new Date(stats.mtime).getTime();
            }));
        });

        return Q.all(filePromises);
    }).then(function () {
        return files;
    });
}

module.exports.prepare = prepare;
module.exports.execCordovaPrepare = execCordovaPrepare;
module.exports.updateTimeStampForFile = updateTimeStampForFile;
module.exports.reset = function () {
    previousPrepareStates = {};
    preparePromise = null;
    lastPlatform = null;
};
