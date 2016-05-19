// Copyright (c) Microsoft Corporation. All rights reserved.

var telemetry = require('telemetry-helper');

var socket;

module.exports.initialize = function (pluginHandlers, serviceToPluginMap) {
    socket = io();
    module.exports.socket = socket;

    socket.on('init-telemetry', function (data) {
        telemetry.init(socket);
    });

    socket.on('refresh', function () {
        document.location.reload(true);
    });

    socket.on('app-plugin-list', function (data) {
        // TODO: process the list of plugins
        socket.emit('start');
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
            var telemetryProps = { plugin: serviceToPluginMap && serviceToPluginMap[service], service: service, action: action };
            if (!handler) {
                socket.emit('telemetry', {event: 'exec', props: {handled: 'none', service: service, action: action}});
                handler = pluginHandlers['*']['*'];
                handler(success, failure, service, action, data.args);
            } else {
                socket.emit('telemetry', {event: 'exec', props: {handled: 'sim-host', service: service, action: action}});
                handler(success, failure, data.args);
            }

            telemetry.sendClientTelemetry('exec', telemetryProps);

        });
        socket.emit('ready');
    });
};

module.exports.notifyPluginsReady = function () {
    socket.emit('register-simulation-host');
};

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
