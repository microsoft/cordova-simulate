// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path'),
    cordovaServe = require('cordova-serve'),
    config = require('./config'),
    dirs = require('./dirs');

var pluginSimulationFiles = require('./plugin-files');

var plugins = {};

var _router;
function initPlugins() {
    // Always defined plugins
    var pluginList = ['exec', 'events'];

    var pluginPath = path.resolve(config.platformRoot, 'plugins');
    if (fs.existsSync(pluginPath)) {
        fs.readdirSync(pluginPath).forEach(function (file) {
            if (fs.statSync(path.join(pluginPath, file)).isDirectory()) {
                pluginList.push(file);
            }
        });
    }

    if (pluginList.indexOf('cordova-plugin-geolocation') === -1) {
        pluginList.push('cordova-plugin-geolocation');
    }

    var projectRoot = config.projectRoot;
    plugins = {};
    pluginList.forEach(function (pluginId) {
        var pluginFilePath = findPluginPath(projectRoot, pluginId);
        if (pluginFilePath) {
            plugins[pluginId] = pluginFilePath;
        }
    });

    addPlatformDefaultHandlers();
    populateRouter();
}

function populateRouter() {
    var router = getRouter();
    router.stack = [];

    Object.keys(plugins).forEach(function (plugin) {
        router.use('/simulator/plugin/' + plugin, cordovaServe.static(plugins[plugin]));
    });
}

/**
 * Adds platform specific exec handlers and ui components to the main plugins list so
 * that they are injected to simulation host along with standard plugins
 */
function addPlatformDefaultHandlers() {
    var platform = config.platform;
    var platformScriptsRoot = path.join(dirs.platforms, platform);
    if (fs.existsSync(platformScriptsRoot)) {
        var pluginId = platform + '-platform-core';
        plugins[pluginId] = platformScriptsRoot;
    }
}

function findPluginPath(projectRoot, pluginId, hostType) {
    if (!hostType) {
        return findPluginPath(projectRoot, pluginId, 'sim-host') || findPluginPath(projectRoot, pluginId, 'app-host');
    }
    for (var file in pluginSimulationFiles[hostType]) {
        var pluginFilePath = findPluginSourceFilePath(projectRoot, pluginId, pluginSimulationFiles[hostType][file]);
        if (pluginFilePath) {
            return pluginFilePath;
        }
    }
}

function findPluginSourceFilePath(projectRoot, pluginId, file) {
    var pluginPath = path.join(projectRoot, 'plugins', pluginId, 'src/simulation');
    var pluginFilePath = path.resolve(pluginPath, file);

    if (fs.existsSync(pluginFilePath)) {
        return pluginPath;
    }

    pluginPath = path.join(dirs.plugins, pluginId);
    pluginFilePath = path.join(pluginPath, file);
    if (fs.existsSync(pluginFilePath)) {
        return pluginPath;
    }

    return null;
}

function getRouter() {
    _router = _router || cordovaServe.Router();
    return _router;
}

module.exports.initPlugins = initPlugins;
module.exports.getRouter = getRouter;
module.exports.getPlugins = function () {
    return plugins
};
