// Copyright (c) Microsoft Corporation. All rights reserved.

/*global io: false */

var Q = require('q'),
    simStatus = require('sim-status'),
    telemetry = require('telemetry-helper');

var socket;
var serviceToPluginMap;

function getSuccess(index) {
    return function (result) {
        console.log('Success callback for index: ' + index + '; result: ' + result);
        var data = { index: index, result: result };
        socket.emit('exec-success', data);
    };
}

function getFailure(index) {
    return function (error) {
        console.log('Failure callback for index: ' + index + '; error: ' + error);
        var data = { index: index, error: error };
        socket.emit('exec-failure', data);
    };
}

function registerSimHost() {
    socket.emit('register-simulation-host');
}

Object.defineProperty(module.exports, 'socket', {
    get: function () {
        return socket; // Will be undefined if called before initialize().
    }
});

module.exports.initialize = function (pluginHandlers, services) {
    var deferred = Q.defer();

    serviceToPluginMap = services;
    socket = io();

    socket.on('init-telemetry', function () {
        telemetry.init(socket);
    });

    socket.on('refresh', function () {
        document.location.reload(true);
    });

    socket.on('retheme', function () {
        var themeLink = document.head.querySelector('link[href="sim-host-theme.css"]');
        if (themeLink) {
            // Trigger the script to reload
            themeLink.href = 'sim-host-theme.css';
        }
    });

    socket.on('connect', function () {
        registerSimHost();
    });

    socket.on('connect_error', function (err) {
        deferred.reject(err);
    });

    socket.on('connect_timeout', function (err) {
        deferred.reject(err);
    });

    socket.on('app-plugin-list', function () {
        // TODO: process the list of plugins (issue #87)
        socket.emit('start');
        simStatus._fireAppHostReady();
    });

    socket.once('init', function (device) {
        deferred.resolve(device);

        socket.on('exec', function (data) {
            var index;

            if (!data) {
                throw 'Exec called on simulation host without exec info';
            }

            index = data.index;
            if (typeof index !== 'number') {
                throw 'Exec called on simulation host without an index specified';
            }

            var success = data.hasSuccess ? getSuccess(index) : null;
            var failure = data.hasFail ? getFailure(index) : null;
            var service = data.service;
            if (!service) {
                throw 'Exec called on simulation host without a service specified';
            }

            var action = data.action;
            if (!action) {
                throw 'Exec called on simulation host without an action specified';
            }

            console.log('Exec ' + service + '.' + action + ' (index: ' + index + ')');

            var handler = pluginHandlers[service] && pluginHandlers[service][action];
            var telemetryProps = { service: service, action: action };
            if (!handler) {
                telemetryProps.handled = 'none';
                handler = pluginHandlers['*']['*'];
                handler(success, failure, service, action, data.args);
            } else {
                telemetryProps.handled = 'sim-host';
                handler(success, failure, data.args);
            }

            telemetry.sendClientTelemetry('exec', telemetryProps);
        });
    });

    socket.on('init', function () {
        socket.emit('ready');
    });

    return deferred.promise;
};

module.exports.notifyPluginsReady = function () {
    telemetry.registerPluginServices(serviceToPluginMap);
};
