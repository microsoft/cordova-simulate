// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path'),
    cordovaServe = require('cordova-serve'),
    Q = require('q'),
    dirs = require('./dirs'),
    pluginUtil = require('./utils/plugins'),
    prepareUtil = require('./utils/prepare'),
    utils = require('./utils/jsUtils');

// TODO telemetry = require('./telemetry-helper');

/**
 * @constructor
 */
function Project(simulator, platform, debugHostHandlers) {
    this._simulator = simulator;

    this.platform = platform;
    this.debugHostHandlers = debugHostHandlers;
    this.simulationFilePath = null;
    // set after the simulation has started
    this.projectRoot = null;
    this.platformRoot = null;

    // plugins data
    this.plugins = null;
    this.pluginsTelemetry = null;
    this._router = null;

    // prepare state
    this._previousPrepareStates = {};
    this._preparePromise = null;
    this._lastPlatform = null;
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
    var that = this;
    function registerPlugins(pluginDictionary) {
        Object.keys(pluginDictionary).forEach(function (pluginId) {
            that.plugins[pluginId] = pluginDictionary[pluginId];
        });
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

/**
 * Prepares the project and initializes the simulation plugin list.
 *
 * @param {Object=} currentState (Optional) The current state of the project for caching purposes.
 */
Project.prototype.prepare = function() {
    if (!this._preparePromise) {
        var d = Q.defer();
        var currentProjectState;

        this._preparePromise = d.promise;
        this._lastPlatform = this.platform;

        this._getProjectState().then(function (currentState) {
            currentProjectState = currentState || this._getProjectState();
            var previousState = this._previousPrepareStates[this.platform];

            if (prepareUtil.shouldPrepare(currentProjectState, previousState)) {
                return prepareUtil.execCordovaPrepare(this.projectRoot, this._lastPlatform).then(function () {
                    return true;
                });
            }

            return Q(false);
        }.bind(this)).then(function (didPrepare) {
            var previousState = this._previousPrepareStates[this.platform];

            if (didPrepare || pluginUtil.shouldInitPlugins(currentProjectState, previousState, this.platform)) {
                this._previousPrepareStates[this.platform] = currentProjectState || this._getProjectState();
                this.initPlugins();
            }

            d.resolve();
        }.bind(this)).finally(function () {
            this._lastPlatform = null;
            this._preparePromise = null;
        }.bind(this)).done();
    } else if (this.platform !== this._lastPlatform) {
        // Sanity check to verify we never queue prepares for different platforms
        throw new Error('Unexpected request to prepare \'' + this.platform + '\' while prepare of \'' + this._lastPlatform + '\' still pending.');
    }

    return this._preparePromise;
};

/**
 * @private
 */
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

Project.prototype.updateTimeStampForFile = function (fileRelativePath, parentDir) {
    var previousState = this._previousPrepareStates[this.platform];
    // get the file absolute path
    var filePath = path.join(this.projectRoot, parentDir, fileRelativePath);

    if (previousState && previousState.files && previousState.files[parentDir] &&
        previousState.files[parentDir][filePath]) {

        previousState.files[parentDir][filePath] = new Date(fs.statSync(filePath).mtime).getTime();
    }
};

/**
 * @return {Promise}
 * @private
 */
Project.prototype._getProjectState = function() {
    var platform = this.platform;
    var projectRoot = this.projectRoot;
    var newState = {};

    return Q().then(function () {
        // Get the list of plugins for the current platform.
        var pluginsJsonPath = path.join(projectRoot, 'plugins', platform + '.json');
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
        var wwwRoot = path.join(projectRoot, 'www');
        var mergesRoot = path.join(projectRoot, 'merges', platform);

        return Q.all([utils.getMtimeForFiles(wwwRoot), utils.getMtimeForFiles(mergesRoot)]);
    }).spread(function (wwwFiles, mergesFiles) {
        var files = {};

        files.www = wwwFiles || {};
        files.merges = mergesFiles || {};
        newState.files = files;

        // Get information about current debug-host handlers.
        newState.debugHostHandlers = this.debugHostHandlers || [];

        // Return the new state.
        return newState;
    }.bind(this));
};

/**
 * @private
 */
Project.prototype._resetPluginsData = function () {
    this.plugins = {};
    this.pluginsTelemetry = {
        simulatedBuiltIn: [],
        simulatedNonBuiltIn: [],
        notSimulated: []
    };
};

module.exports = Project;
