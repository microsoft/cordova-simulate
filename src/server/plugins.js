// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path'),
    cordovaServe = require('cordova-serve'),
    pluginMapper = require('cordova-registry-mapper').oldToNew,
    config = require('./config'),
    dirs = require('./dirs'),
    telemetry = require('./telemetry-helper');

var pluginSimulationFiles = require('./plugin-files');

var plugins;
var pluginsTelemetry;
var _router;

function resetPluginsData() {
    plugins = {};
    pluginsTelemetry = {
        simulatedBuiltIn: [],
        simulatedNonBuiltIn: [],
        notSimulated: []
    };
}

function initPlugins() {
    resetPluginsData();

    // Find the default plugins
    var projectRoot = config.projectRoot;
    var defaultPlugins = ['cordova-plugin-geolocation', 'exec', 'events'];
    var simulatedDefaultPlugins = {};

    defaultPlugins.forEach(function (pluginId) {
        var pluginPath = findPluginPath(projectRoot, pluginId);

        if (pluginPath) {
            simulatedDefaultPlugins[pluginId] = pluginPath;
            pluginsTelemetry.simulatedBuiltIn.push(pluginId);
        }
    });

    // Find the project plugins that can be simulated.
    var projectPluginsRoot = path.resolve(config.platformRoot, 'plugins');
    var rawProjectPluginList = getDirectoriesInPath(projectPluginsRoot);

    /* if the geolocation plugin is already added to the project,
       we need to remove it since it is in the list of default plugins as well and will appear twice otherwise */
    var geolocationIndex = rawProjectPluginList.indexOf('cordova-plugin-geolocation');
    if (geolocationIndex >= 0) {
        rawProjectPluginList.splice(geolocationIndex, 1);
    }

    var simulatedProjectPlugins = {};

    rawProjectPluginList.forEach(function (pluginId) {
        var pluginFilePath = findPluginPath(projectRoot, pluginId);

        if (pluginFilePath && shouldUsePluginWithDebugHost(pluginFilePath, true)) {
            simulatedProjectPlugins[pluginId] = pluginFilePath;

            if (pluginFilePath.indexOf(dirs.plugins) === 0) {
                pluginsTelemetry.simulatedBuiltIn.push(pluginId);
            } else {
                pluginsTelemetry.simulatedNonBuiltIn.push(pluginId);
            }
        } else {
            pluginsTelemetry.notSimulated.push(pluginId);
        }
    });

    // Find built-in debug-host plugins (plugins that should be part of the simulation due to the presence of a
    // debug-host, even if they weren't added to the project).
    var simulatedDebugHostPlugins = {};

    if (config.debugHostHandlers) {
        var rawBuiltInPluginList = getDirectoriesInPath(dirs.plugins);

        rawBuiltInPluginList.forEach(function (pluginId) {
            if (simulatedDefaultPlugins[pluginId] || simulatedProjectPlugins[pluginId]) {
                return;
            }

            var pluginPath = path.join(dirs.plugins, pluginId);

            if (pluginPath && shouldUsePluginWithDebugHost(pluginPath)) {
                simulatedDebugHostPlugins[pluginId] = pluginPath;
                pluginsTelemetry.simulatedBuiltIn.push(pluginId);
            }
        });
    }

    // Register the plugins. The default plugins are first, then the debug-host plugins (to have the correct order in
    // sim-host).
    function registerPlugins(pluginDictionary) {
        Object.keys(pluginDictionary).forEach(function (pluginId) {
            plugins[pluginId] = pluginDictionary[pluginId];
        });
    }

    registerPlugins(simulatedDefaultPlugins);
    registerPlugins(simulatedDebugHostPlugins);
    registerPlugins(simulatedProjectPlugins);

    telemetry.sendTelemetry('plugin-list', { simulatedBuiltIn: pluginsTelemetry.simulatedBuiltIn },
        { simulatedNonBuiltIn: pluginsTelemetry.simulatedNonBuiltIn, notSimulated: pluginsTelemetry.notSimulated });
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
    // Look in the plugin itself
    var pluginPath = path.join(projectRoot, 'plugins', pluginId, 'src/simulation');
    var pluginFilePath = path.resolve(pluginPath, file);
    return fs.existsSync(pluginFilePath) ? pluginPath : findBuiltInPluginSourceFilePath(pluginId, file);
}

function findBuiltInPluginSourceFilePath(pluginId, file) {
    var pluginPath = path.join(dirs.plugins, pluginId);
    var pluginFilePath = path.join(pluginPath, file);
    if (fs.existsSync(pluginFilePath)) {
        return pluginPath;
    }

    // In case plugin id is in old style, try mapping to new style to see if we have support for that.
    pluginId = pluginMapper[pluginId];
    return pluginId ? findBuiltInPluginSourceFilePath(pluginId, file) : null;
}

function shouldUsePluginWithDebugHost(pluginPath, pluginAddedToProject) {
    pluginAddedToProject = !!pluginAddedToProject;

    // Check whether the plugin defines some debug-host requirements.
    var debugHostFilePath = path.join(pluginPath, pluginSimulationFiles['debug-host']['debug-host'])

    if (!fs.existsSync(debugHostFilePath)) {
        // Plugin doesn't have any requirements for debug-host. Always use the plugin if it was added to the project.
        return pluginAddedToProject;
    }

    var debugHostOptions;

    try {
        debugHostOptions = JSON.parse(fs.readFileSync(debugHostFilePath, 'utf8'));
    } catch (err) {
        // Can't determine plugin's debug-host requirements, so ignore them. Use the plugin if it was added to the
        // project.
        return pluginAddedToProject;
    }

    // If the plugin requires debug-host handlers, check if there is a debug-host and whether it supports them.
    if (debugHostOptions.messages && Array.isArray(debugHostOptions.messages)) {
        if (!config.debugHostHandlers) {
            return false;
        }

        for (var i = 0; i < debugHostOptions.messages.length; ++i) {
            var messageName = debugHostOptions.messages[i];

            if (config.debugHostHandlers.indexOf(messageName) < 0) {
                // The plugin requires a handler not supported by the current debug-host, so it can't be used.
                return false;
            }
        }
    }

    // The current debug-host supports all required handlers for the plugin.
    return pluginAddedToProject || !!debugHostOptions.alwaysActivateIfDebugHost;
}

function getDirectoriesInPath(dirPath) {
    var dirList = [];

    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach(function (file) {
            if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
                dirList.push(file);
            }
        });
    }

    return dirList;
}

function getRouter() {
    _router = _router || cordovaServe.Router();
    return _router;
}

function clear() {
    resetPluginsData();
    _router = null;
}

module.exports.initPlugins = initPlugins;
module.exports.clear = clear;
module.exports.getRouter = getRouter;
module.exports.getPlugins = function () {
    return plugins;
};
module.exports.getPluginsTelemetry = function () {
    return pluginsTelemetry;
};
