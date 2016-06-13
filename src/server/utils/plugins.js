// Copyright (c) Microsoft Corporation. All rights reserved.

var path = require('path'),
    fs = require('fs'),
    pluginMapper = require('cordova-registry-mapper').oldToNew;

var pluginSimulationFiles = require('../plugin-files'),
    jsUtils = require('./jsUtils'),
    dirs = require('../dirs');

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
    var pluginsDir = dirs.plugins;
    var pluginPath = path.join(pluginsDir, pluginId);
    var pluginFilePath = path.join(pluginPath, file);
    if (fs.existsSync(pluginFilePath)) {
        return pluginPath;
    }

    // In case plugin id is in old style, try mapping to new style to see if we have support for that.
    pluginId = pluginMapper[pluginId];
    return pluginId ? findBuiltInPluginSourceFilePath(pluginId, file) : null;
}

function shouldUsePluginWithDebugHost(pluginPath, pluginAddedToProject, debugHostHandlers) {
    pluginAddedToProject = !!pluginAddedToProject;

    // Check whether the plugin defines some debug-host requirements.
    var debugHostFilePath = path.join(pluginPath, pluginSimulationFiles['debug-host']['debug-host']);

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
        if (!debugHostHandlers) {
            return false;
        }

        for (var i = 0; i < debugHostOptions.messages.length; ++i) {
            var messageName = debugHostOptions.messages[i];

            if (debugHostHandlers.indexOf(messageName) < 0) {
                // The plugin requires a handler not supported by the current debug-host, so it can't be used.
                return false;
            }
        }
    }

    // The current debug-host supports all required handlers for the plugin.
    return pluginAddedToProject || !!debugHostOptions.alwaysActivateIfDebugHost;
}

function shouldInitPlugins(currentState, previousState, platform) {
    // We should init plugins if we don't have any info on a previous prepare for the current platform, or if there is
    // a difference in the list of installed plugins or debug-host handlers.
    if (!previousState) {
        return true;
    }

    // Use JSON stringification to compare states. This works because a state is an object that only contains
    // serializable values, and because the glob module, which is used to read directories recursively, is
    // deterministic in the order of the files it returns.
    var pluginsAreTheSame = jsUtils.compareObjects(currentState.pluginList, previousState.pluginList);
    var debugHandlersAreTheSame = jsUtils.compareObjects(currentState.debugHostHandlers, previousState.debugHostHandlers);

    return !pluginsAreTheSame || !debugHandlersAreTheSame;
}

module.exports.findPluginPath = findPluginPath;
module.exports.findPluginSourceFilePath = findPluginSourceFilePath;
module.exports.findBuiltInPluginSourceFilePath = findBuiltInPluginSourceFilePath;
module.exports.shouldUsePluginWithDebugHost = shouldUsePluginWithDebugHost;
module.exports.shouldInitPlugins = shouldInitPlugins;
