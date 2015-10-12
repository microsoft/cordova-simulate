// Copyright (c) Microsoft Corporation. All rights reserved.

var Messages = require('messages');

var cordova;
var oldExec;
var socket = io();
var nextExecCacheIndex = 0;
var execCache = {};
var pluginHandlers = {};

function setCordova(originalCordova) {
    if (cordova) {
        return;
    }

    cordova = originalCordova;

    oldExec = cordova.require('cordova/exec');
    cordova.define.remove('cordova/exec');
    cordova.define('cordova/exec', function (require, exports, module) {
        module.exports = exec;
    });

    // android platform has its own specific initialization
    // so to emulate it, we need to fake init function
    if (cordova.platformId === 'android') {
        exec.init = function () { 
            cordova.require('cordova/channel').onNativeReady.fire(); 
        };
    }

    // windows phone platform fires 'deviceready' event from native component
    // so to emulate it we fire it in the bootstrap function (similar to ios)
    if (cordova.platformId === 'windowsphone') {
        cordova.require('cordova/platform').bootstrap = function () {
            cordova.require('cordova/channel').onNativeReady.fire();
        };
    }

    // default Windows bootstrap function tries to load WinJS which is not
    // available and not required in simulation mode so we override bootstrap
    if (cordova.platformId === 'windows') {
        cordova.require('cordova/platform').bootstrap = function () {
            cordova.require('cordova/modulemapper')
                .clobbers('cordova/exec/proxy', 'cordova.commandProxy');

            cordova.require('cordova/channel').onNativeReady.fire();
        };
    }
}

function getCordova() {
    return cordova;
}

socket.on('exec-success', function (data) {
    console.log('exec-success:');
    console.log(data);
    var execCacheInfo = execCache[data.index];
    if (execCacheInfo.success) {
        execCacheInfo.success(data.result);
    }
});

socket.on('exec-failure', function (data) {
    console.log('exec-failure:');
    console.log(data);
    var execCacheInfo = execCache[data.index];
    if (execCacheInfo.fail) {
        execCacheInfo.fail(data.error);
    }
});

socket.emit('register-app-host');

function exec(success, fail, service, action, args) {
    // If we have a local handler, call that. Otherwise pass it to the simulation host.
    var handler = pluginHandlers[service] && pluginHandlers[service][action];
    if (handler) {
        // Ensure local handlers are executed asynchronously.
        setTimeout(function () {
            handler(success, fail, service, action, args);
        }, 0);
    } else {
        var execIndex = nextExecCacheIndex++;
        execCache[execIndex] = {index: execIndex, success: success, fail: fail};
        socket.emit('exec', {index: execIndex, service: service, action: action, args: args, hasSuccess: !!success, hasFail: !!fail});
    }
}

// Setup for cordova.exec patching
Object.defineProperty(window, 'cordova', {
    set: setCordova,
    get: getCordova
});

function clobber(clobbers, scope) {
    Object.keys(clobbers).forEach(function (key) {
        if (clobbers[key] && typeof clobbers[key] === 'object') {
            scope[key] =  scope[key] || {};
            clobber(clobbers[key], scope[key]);
        } else {
            scope[key] = clobbers[key];
        }
    });
}

// Details of each plugin that has app-host code is injected when this file is served.
var plugins = {
    /** PLUGINS **/
};

var pluginHandlersDefinitions = {
    /** PLUGIN-HANDLERS **/
};

var pluginClobberDefinitions = {
    /** PLUGIN-CLOBBERS **/
};

var pluginMessages = {};
applyPlugins(plugins);
applyPlugins(pluginHandlersDefinitions, pluginHandlers);
applyPlugins(pluginClobberDefinitions, window);

function applyPlugins(plugins, clobberScope) {
    Object.keys(plugins).forEach(function (pluginId) {
        var plugin = plugins[pluginId];
        if (plugin) {
            if (typeof plugin === 'function') {
                pluginMessages[pluginId] = pluginMessages[pluginId] || new Messages(pluginId, socket);
                plugin = plugin(pluginMessages[pluginId], exec);
                plugins[pluginId] = plugin;
            }
            if (clobberScope) {
                clobber(plugin, clobberScope);
            }
        }
    });
}
