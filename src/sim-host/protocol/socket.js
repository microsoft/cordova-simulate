// Copyright (c) Microsoft Corporation. All rights reserved.

/*global io: false */

var telemetry = require('telemetry-helper'),
    simStatus = require('sim-status');

var registerOnInitialize = false;
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
    serviceToPluginMap = services;
    socket = io();

    socket.on('init-telemetry', function () {
        telemetry.init(socket);
    });

    socket.on('refresh', function () {
        document.location.reload(true);
    });

    socket.on('app-plugin-list', function () {
        // TODO: process the list of plugins (issue #87)
        socket.emit('start');
        simStatus._fireAppHostReady();
    });

    socket.once('init', function () {
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

    if (registerOnInitialize) {
        registerSimHost();
    }
};

module.exports.notifyPluginsReady = function () {
    telemetry.registerPluginServices(serviceToPluginMap);

    if (socket) {
        registerSimHost();
    } else {
        registerOnInitialize = true;
    }
};
