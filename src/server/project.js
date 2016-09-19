// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path'),
    cordovaServe = require('cordova-serve'),
    Q = require('q'),
    dirs = require('./dirs'),
    pluginUtil = require('./utils/plugins'),
    prepareUtil = require('./utils/prepare'),
    utils = require('./utils/jsUtils'),
    log = require('./utils/log');

/**
 * The Project model encapsulates the information and state about the project under
 * simulation. It handles the project's plugins and cordova prepare operation.
 * @param {object} simulatorProxy
 * @param {string} platform
 * @constructor
 */
function Project(simulatorProxy, platform) {
    this._simulatorProxy = simulatorProxy;
    this._platform = platform;
    // set after the simulation has started
    this._projectRoot = null;
    this._platformRoot = null;

    // plugins data
    this.plugins = null;
    this.pluginsTelemetry = null;
    this._router = null;

    // prepare state
    this._previousPrepareStates = {};
    this._preparePromise = null;
    this._lastPlatform = null;
}

Object.defineProperties(Project.prototype, {
    'projectRoot': {
        set: function (projectRoot) {
            if (this._projectRoot && this._projectRoot !== projectRoot) {
                throw new Error('Can\'t reinitialize "projectRoot"');
            }
            this._projectRoot = projectRoot;
        },
        get: function () {
            return this._projectRoot;
        }
    },
    'platformRoot': {
        set: function (platformRoot) {
            this._platformRoot = platformRoot;
        },
        get: function () {
            return this._platformRoot;
        }
    },
    'platform': {
        get: function () {
            return this._platform;
        }
    }
});

/**
 * @const
 */
Project.DEFAULT_PLUGINS = [
    'cordova-plugin-geolocation',
    'exec',
    'events',
    'cordova-plugin-device'
];

Project.prototype.initPlugins = function () {
    this._resetPluginsData();

    // Find the default plugins
    var simulatedDefaultPlugins = {};
    var debugHostHandlers = this._simulatorProxy.config.debugHostHandlers;

    Project.DEFAULT_PLUGINS.forEach(function (pluginId) {
        var pluginPath = pluginUtil.findPluginPath(this.projectRoot, pluginId);

        if (pluginPath) {
            simulatedDefaultPlugins[pluginId] = pluginPath;
            this.pluginsTelemetry.simulatedBuiltIn.push(pluginId);
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

        if (pluginFilePath && pluginUtil.shouldUsePluginWithDebugHost(pluginFilePath, true, debugHostHandlers)) {
            simulatedProjectPlugins[pluginId] = pluginFilePath;

            if (pluginFilePath.indexOf(dirs.plugins) === 0) {
                this.pluginsTelemetry.simulatedBuiltIn.push(pluginId);
            } else {
                this.pluginsTelemetry.simulatedNonBuiltIn.push(pluginId);
            }
        } else {
            this.pluginsTelemetry.notSimulated.push(pluginId);
        }
    }.bind(this));

    // Find built-in debug-host plugins (plugins that should be part of the simulation due to the presence of a
    // debug-host, even if they weren't added to the project).
    var simulatedDebugHostPlugins = {};

    if (debugHostHandlers) {
        var rawBuiltInPluginList = utils.getDirectoriesInPath(dirs.plugins);

        rawBuiltInPluginList.forEach(function (pluginId) {
            if (simulatedDefaultPlugins[pluginId] || simulatedProjectPlugins[pluginId]) {
                return;
            }

            var pluginPath = path.join(dirs.plugins, pluginId);

            if (pluginPath && pluginUtil.shouldUsePluginWithDebugHost(pluginPath, null, debugHostHandlers)) {
                simulatedDebugHostPlugins[pluginId] = pluginPath;
                this.pluginsTelemetry.simulatedBuiltIn.push(pluginId);
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

    this._simulatorProxy.telemetry.sendTelemetry('plugin-list', {
        simulatedBuiltIn: this.pluginsTelemetry.simulatedBuiltIn
    }, {
        simulatedNonBuiltIn: this.pluginsTelemetry.simulatedNonBuiltIn,
        notSimulated: this.pluginsTelemetry.notSimulated
    });
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

Project.prototype.hasBuiltInPluginTelemetry = function (plugin) {
    var builtIn = this.pluginsTelemetry.simulatedBuiltIn;

    return (builtIn.indexOf(plugin) !== -1);
};

/**
 * Prepares the project and initializes the simulation plugin list.
 *
 * @param {Object=} currentState (Optional) The current state of the project for caching purposes.
 */
Project.prototype.prepare = function () {
    if (!this._preparePromise) {
        var d = Q.defer();
        var currentProjectState;

        this._preparePromise = d.promise;
        this._lastPlatform = this.platform;

        this._getProjectState()
            .then(function (currentState) {
                currentProjectState = currentState;

                if (this._shouldPrepare(currentProjectState)) {
                    var platform = this._lastPlatform;
                    return prepareUtil.execCordovaPrepare(this.projectRoot, platform)
                        .catch(function (err) {
                            log.warning('Preparing platform \'' + platform + '\' failed: ' + utils.stripErrorColon(err));
                        }).then(function () {
                            // Note that we return true even if we caught an error (in case the error
                            // was in a hook, for example, and the prepare actually succeeded).
                            return true;
                        });
                }

                return Q(false);
            }.bind(this))
            .then(function (didPrepare) {
                if (didPrepare || this._shouldInitPlugins(currentProjectState)) {
                    this._previousPrepareStates[this.platform] = currentProjectState;
                    this.initPlugins();
                }

                d.resolve();
            }.bind(this))
            .catch(function (err) {
                d.reject(err);
            })
            .finally(function () {
                this._lastPlatform = null;
                this._preparePromise = null;
            }.bind(this));
    } else if (this.platform !== this._lastPlatform) {
        // Sanity check to verify we never queue prepares for different platforms
        throw new Error('Unexpected request to prepare \'' + this.platform + '\' while prepare of \'' + this._lastPlatform + '\' still pending.');
    }

    return this._preparePromise;
};

Project.prototype.reset = function () {
    this._resetPluginsData();
    this._router = null;
    this._previousPrepareStates = {};
};

/**
 * @param {object} currentState
 * @return {boolean}
 */
Project.prototype._shouldPrepare = function (currentState) {
    var previousState = this._previousPrepareStates[this.platform];
    // We should prepare if we don't have any info on a previous prepare for the current platform, or if there is a
    // difference in the list of installed plugins, the merges files or the www files.
    if (!previousState) {
        return true;
    }

    var pluginsAreTheSame = utils.compareObjects(currentState.pluginList, previousState.pluginList);
    var filesAreTheSame = utils.compareObjects(currentState.files, previousState.files);

    return !pluginsAreTheSame || !filesAreTheSame;
};

/**
 * @param {object} currentState
 * @return {boolean}
 */
Project.prototype._shouldInitPlugins = function(currentState) {
    var previousState = this._previousPrepareStates[this.platform];
    // We should init plugins if we don't have any info on a previous prepare for the current platform, or if there is
    // a difference in the list of installed plugins or debug-host handlers.
    if (!previousState) {
        return true;
    }

    // Use JSON stringification to compare states. This works because a state is an object that only contains
    // serializable values, and because the glob module, which is used to read directories recursively, is
    // deterministic in the order of the files it returns.
    var pluginsAreTheSame = utils.compareObjects(currentState.pluginList, previousState.pluginList);
    var debugHandlersAreTheSame = utils.compareObjects(currentState.debugHostHandlers, previousState.debugHostHandlers);

    return !pluginsAreTheSame || !debugHandlersAreTheSame;
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

    return Q()
        .then(function () {
            // Get the list of plugins for the current platform.
            var pluginsJsonPath = path.join(projectRoot, 'plugins', platform + '.json');
            return Q.nfcall(fs.readFile, pluginsJsonPath);
        })
        .fail(function () {
            // an error ocurred trying to read the file for the current platform,
            // return an empty json file content
            return '{}';
        })
        .then(function (fileContent) {
            var installedPlugins;

            try {
                installedPlugins = Object.keys(JSON.parse(fileContent.toString())['installed_plugins'] || {});
            } catch (err) {
                // For some reason, it was not possible to determine which plugins are installed for the current platform, so
                // use a dummy value to indicate a "bad state".
                installedPlugins = ['__unknown__'];
            }

            newState.pluginList = installedPlugins;
        })
        .then(function () {
            // Get the modification times for project files.
            var wwwRoot = path.join(projectRoot, 'www');
            var mergesRoot = path.join(projectRoot, 'merges', platform);

            return Q.all([utils.getMtimeForFiles(wwwRoot), utils.getMtimeForFiles(mergesRoot)]);
        })
        .spread(function (wwwFiles, mergesFiles) {
            var files = {};

            files.www = wwwFiles || {};
            files.merges = mergesFiles || {};
            newState.files = files;

            // Get information about current debug-host handlers.
            newState.debugHostHandlers = this._simulatorProxy.config.debugHostHandlers || [];

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
