// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path'),
    cordovaServe = require('cordova-serve'),
    dirs = require('../dirs');

var pluginUtil = require('./plugin'),
    utils = require('../jsUtils');

// TODO config = require('./config'),
// TODO telemetry = require('./telemetry-helper');

/**
 * @constructor
 */
function Project(simulator, projectRoot, platform, platformRoot, debugHostHandlers) {
    this._simulator = simulator;

    this.projectRoot = projectRoot;
    this.platform = platform;
    this.platformRoot = platformRoot;
    this.debugHostHandlers = debugHostHandlers;
    this.simulationFilePath = null;

    this.plugins = null;
    this.pluginsTelemetry = null;
    this._router = null;
}

Project.DEFAULT_PLUGINS = [
    'cordova-plugin-geolocation',
    'exec',
    'events'
];

Project.prototype.configureSimulationDirectory = function (simulationPath) {
    var simPath = simulationPath || path.join(this.projectRoot, 'simulation');
    this.simulationFilePath = path.resolve(simPath);

    if (!fs.existsSync(this.simulationFilePath)) {
        utils.makeDirectoryRecursiveSync(this.simulationFilePath);
    }
};

Project.prototype.prepare = function () {
    // TODO
};

Project.prototype.initPlugins = function () {
    this._resetPluginsData();

    // Find the default plugins
    var simulatedDefaultPlugins = {};

    Project.DEFAULT_PLUGINS.forEach(function (pluginId) {
        var pluginPath = pluginUtil.findPluginPath(this.projectRoot, pluginId);

        if (pluginPath) {
            simulatedDefaultPlugins[pluginId] = pluginPath;
            // TODO pluginsTelemetry.simulatedBuiltIn.push(pluginId);
        }
    }.bind(this));

    // Find the project plugins that can be simulated.
    var projectPluginsRoot = path.resolve(this.platformRoot, 'plugins');
    var rawProjectPluginList = utils.getDirectoriesInPath(projectPluginsRoot);

    /* if the geolocation plugin is already added to the project,
       we need to remove it since it is in the list of default plugins as well and will appear twice otherwise */
    var geolocationIndex = rawProjectPluginList.indexOf('cordova-plugin-geolocation');
    if (geolocationIndex >= 0) {
        rawProjectPluginList.splice(geolocationIndex, 1);
    }

    var simulatedProjectPlugins = {};

    rawProjectPluginList.forEach(function (pluginId) {
        var pluginFilePath = pluginUtil.findPluginPath(this.projectRoot, pluginId);

        if (pluginFilePath && pluginUtil.shouldUsePluginWithDebugHost(pluginFilePath, true, this.debugHostHandlers)) {
            simulatedProjectPlugins[pluginId] = pluginFilePath;

            if (pluginFilePath.indexOf(dirs.plugins) === 0) {
                // TODO pluginsTelemetry.simulatedBuiltIn.push(pluginId);
            } else {
                // TODO pluginsTelemetry.simulatedNonBuiltIn.push(pluginId);
            }
        } else {
            // TODO pluginsTelemetry.notSimulated.push(pluginId);
        }
    }.bind(this));

    // Find built-in debug-host plugins (plugins that should be part of the simulation due to the presence of a
    // debug-host, even if they weren't added to the project).
    var simulatedDebugHostPlugins = {};

    if (this.debugHostHandlers) {
        var rawBuiltInPluginList = utils.getDirectoriesInPath(dirs.plugins);

        rawBuiltInPluginList.forEach(function (pluginId) {
            if (simulatedDefaultPlugins[pluginId] || simulatedProjectPlugins[pluginId]) {
                return;
            }

            var pluginPath = path.join(dirs.plugins, pluginId);

            if (pluginPath && pluginUtil.shouldUsePluginWithDebugHost(pluginPath, null, this.debugHostHandlers)) {
                simulatedDebugHostPlugins[pluginId] = pluginPath;
                // TODO pluginsTelemetry.simulatedBuiltIn.push(pluginId);
            }
        }.bind(this));
    }

    // Register the plugins. The default plugins are first, then the debug-host plugins (to have the correct order in
    // sim-host).
    function registerPlugins(pluginDictionary) {
        Object.keys(pluginDictionary).forEach(function (pluginId) {
            this.plugins[pluginId] = pluginDictionary[pluginId];
        }.bind(this));
    }

    registerPlugins(simulatedDefaultPlugins);
    registerPlugins(simulatedDebugHostPlugins);
    registerPlugins(simulatedProjectPlugins);

    // TODO telemetry.sendTelemetry('plugin-list', { simulatedBuiltIn: pluginsTelemetry.simulatedBuiltIn },
    //    { simulatedNonBuiltIn: pluginsTelemetry.simulatedNonBuiltIn, notSimulated: pluginsTelemetry.notSimulated });
    this._addPlatformDefaultHandlers();
    this._populateRouter();
};

Project.prototype.getPlugins = function () {
    return this.plugins;
};

Project.prototype.getRouter = function () {
    this._router = this._router || cordovaServe.Router();
    return this._router;
};

Project.prototype.getPluginsTelemetry = function () {
    return this.pluginsTelemetry;
};

// private API

Project.prototype._resetPluginsData = function () {
    this.plugins = {};
    this.pluginsTelemetry = {
        simulatedBuiltIn: [],
        simulatedNonBuiltIn: [],
        notSimulated: []
    };
};

Project.prototype._populateRouter = function () {
    var router = this.getRouter();
    router.stack = [];

    Object.keys(this.plugins).forEach(function (plugin) {
        router.use('/simulator/plugin/' + plugin, cordovaServe.static(this.plugins[plugin]));
    }.bind(this));
};

/**
 * Adds platform specific exec handlers and ui components to the main plugins list so
 * that they are injected to simulation host along with standard plugins
 * @private
 */
Project.prototype._addPlatformDefaultHandlers = function () {
    var platformScriptsRoot = path.join(dirs.platforms, this.platform);
    if (fs.existsSync(platformScriptsRoot)) {
        var pluginId = this.platform + '-platform-core';
        this.plugins[pluginId] = platformScriptsRoot;
    }
};

// TODO might not be needed
Project.prototype._reset = function () {
    this._resetPluginsData();
    this._router = null;
};

module.exports.Project = Project;
