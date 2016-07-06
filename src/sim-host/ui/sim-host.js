// Copyright (c) Microsoft Corporation. All rights reserved.

var customElements = require('./custom-elements'),
    db = require('db'),
    dialog = require('dialog'),
    Messages = require('messages'),
    Q = require('q'),
    socket = require('../protocol/socket');

var COLLAPSED_PANELS_KEY = 'collapsed-panels';

var plugins;
var pluginHandlers = {};
var serviceToPluginMap = {};
var initSocketPromise = socket.initialize(pluginHandlers, serviceToPluginMap);

customElements.initialize(changePanelVisibilityCallback);

window.addEventListener('DOMContentLoaded', function () {
    sizeContent();
    Q.all([db.initialize(), initSocketPromise]).then(function () {
        initializePlugins();

        // Some panels, like geolocation, need to be fully initialized before they can be hidden, otherwise they will
        // stop working. For that reason, we restore the initial collapse state to the panels only after plugin
        // initialization.
        getCollapsedPanels().forEach(function (panelId) {
            document.getElementById(panelId).cordovaCollapsed = true;
        });
    }).done();
});

window.addEventListener('resize', function () {
    sizeContent();
});

function changePanelVisibilityCallback(id, isNowCollapsed) {
    var collapsedPanels = getCollapsedPanels();
    var index = collapsedPanels.indexOf(id);

    if (isNowCollapsed && index === -1) {
        collapsedPanels.push(id);
    } else if (!isNowCollapsed && index > -1) {
        collapsedPanels.splice(index, 1);
    }

    db.saveObject(COLLAPSED_PANELS_KEY, collapsedPanels);
}

function getCollapsedPanels() {
    var collapsedPanels = db.retrieveObject(COLLAPSED_PANELS_KEY);

    if (!Array.isArray(collapsedPanels)) {
        collapsedPanels = [];
    }

    return collapsedPanels;
}

function sizeContent() {
    // Size the content area to keep column widths fixed
    var bodyWidth = parseInt(window.getComputedStyle(document.body).width);
    var contentWidth = (Math.floor((bodyWidth - 1) / 333) || 1) * 333;
    document.querySelector('.cordova-main').style.width = contentWidth + 'px';
}

var pluginMessages = {};
function applyPlugins(plugins, clobberScope, clobberToPluginMap) {
    Object.keys(plugins).forEach(function (pluginId) {
        var plugin = plugins[pluginId];
        if (plugin) {
            if (typeof plugin === 'function') {
                pluginMessages[pluginId] = pluginMessages[pluginId] || new Messages(pluginId, socket.socket);
                plugin = plugin(pluginMessages[pluginId]);
                plugins[pluginId] = plugin;
            }
            if (clobberScope) {
                clobber(plugin, clobberScope, clobberToPluginMap, pluginId);
            }
        }
    });
}

function clobber(clobbers, scope, clobberToPluginMap, pluginId) {
    Object.keys(clobbers).forEach(function (key) {
        if (clobberToPluginMap && pluginId) {
            clobberToPluginMap[key] = pluginId;
        }

        if (clobbers[key] && typeof clobbers[key] === 'object') {
            scope[key] = scope[key] || {};
            clobber(clobbers[key], scope[key]);
        } else {
            scope[key] = clobbers[key];
        }
    });
}

function initializePlugins() {
    plugins = {
        /** PLUGINS **/
    };

    var pluginHandlersDefinitions = {
        /** PLUGIN-HANDLERS **/
    };

    applyPlugins(plugins);
    applyPlugins(pluginHandlersDefinitions, pluginHandlers, serviceToPluginMap);

    // Hide and register dialogs
    Array.prototype.forEach.call(document.getElementById('popup-window').children, function (dialogRef) {
        dialogRef.show = function () {
            document.getElementById('popup-window').style.display = '';
            this.style.display = '';
        };
        dialogRef.hide = function () {
            document.getElementById('popup-window').style.display = 'none';
            this.style.display = 'none';
        };
        dialog.pluginDialogs[dialogRef.id] = dialogRef;
        dialogRef.style.display = 'none';
    });

    Object.keys(plugins).forEach(function (pluginId) {
        try {
            plugins[pluginId].initialize && plugins[pluginId].initialize();
        } catch (e) {
            console.error('Error initializing plugin ' + pluginId);
            console.error(e);
        }
    });

    socket.notifyPluginsReady();
}
