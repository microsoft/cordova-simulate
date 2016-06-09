// Copyright (c) Microsoft Corporation. All rights reserved.

var log = require('./log'),
    config = require('./config'),
    livereload = require('./live-reload/live-reload-server'),
    telemetry = require('./telemetry-helper');

var APP_HOST = 'app-host';
var SIM_HOST = 'sim-host';
var DEBUG_HOST = 'debug-host';

var io;
var hostSockets = {};
var pendingEmits = {};
pendingEmits[APP_HOST] = [];
pendingEmits[SIM_HOST] = [];
pendingEmits[DEBUG_HOST] = [];

function reset() {
    hostSockets = {};
    pendingEmits = {};
    pendingEmits[APP_HOST] = [];
    pendingEmits[SIM_HOST] = [];
    pendingEmits[DEBUG_HOST] = [];
}

function init(server) {
    reset();

    io = require('socket.io')(server);

    io.on('connection', function (socket) {
        socket.on('register-app-host', function () {
            log.log('App-host registered with server.');

            // It only makes sense to have one app host per server. If more than one tries to connect, always take the
            // most recent.
            hostSockets[APP_HOST] = socket;

            socket.on('exec', function (data) {
                emitToHost(SIM_HOST, 'exec', data);
            });

            socket.on('plugin-message', function (data) {
                emitToHost(SIM_HOST, 'plugin-message', data);
            });

            socket.on('plugin-method', function (data, callback) {
                emitToHost(SIM_HOST, 'plugin-method', data, callback);
            });

            socket.on('telemetry', function (data) {
                telemetry.handleClientTelemetry(data);
            });

            socket.on('debug-message', function (data) {
                emitToHost(DEBUG_HOST, data.message, data.data);
            });

            // Set up live reload if necessary.
            if (config.liveReload) {
                log.log('Starting live reload.');
                livereload.init(socket);
            }

            // Set up telemetry if necessary.
            if (config.telemetry) {
                socket.emit('init-telemetry');
            }

            // Set up xhr proxy
            if (config.xhrProxy) {
                socket.emit('init-xhr-proxy');
            }

            // setup touch events support
            if (config.touchEvents) {
                socket.emit('init-touch-events');
            }

            handlePendingEmits(APP_HOST);
        });

        socket.on('register-simulation-host', function () {
            log.log('Simulation host registered with server.');

            // It only makes sense to have one simulation host per server. If more than one tries to connect, always
            // take the most recent.
            hostSockets[SIM_HOST] = socket;

            socket.on('exec-success', function (data) {
                emitToHost(APP_HOST, 'exec-success', data);
            });
            socket.on('exec-failure', function (data) {
                emitToHost(APP_HOST, 'exec-failure', data);
            });

            socket.on('plugin-message', function (data) {
                emitToHost(APP_HOST, 'plugin-message', data);
            });

            socket.on('plugin-method', function (data, callback) {
                emitToHost(APP_HOST, 'plugin-method', data, callback);
            });

            socket.on('telemetry', function (data) {
                telemetry.handleClientTelemetry(data);
            });

            socket.on('debug-message', function (data) {
                emitToHost(DEBUG_HOST, data.message, data.data);
            });

            // Set up telemetry if necessary.
            if (config.telemetry) {
                socket.emit('init-telemetry');
            }

            handlePendingEmits(SIM_HOST);
        });

        socket.on('register-debug-host', function (data) {
            log.log('Debug-host registered with server.');

            // It only makes sense to have one debug host per server. If more than one tries to connect, always take
            // the most recent.
            hostSockets[DEBUG_HOST] = socket;

            if (data && data.handlers) {
                socket.on('disconnect', function () {
                    log.log('Debug-host disconnected.');
                    config.debugHostHandlers = null;
                });
                config.debugHostHandlers = data.handlers;
            }

            handlePendingEmits(DEBUG_HOST);
        });
    });
}

function handlePendingEmits(host) {
    pendingEmits[host].forEach(function (pendingEmit) {
        log.log('Handling pending emit \'' + pendingEmit.msg + '\' to ' + host);
        emitToHost(host, pendingEmit.msg, pendingEmit.data, pendingEmit.callback);
    });
    pendingEmits[host] = [];
}

function emitToHost(host, msg, data, callback) {
    var socket = hostSockets[host];
    if (socket) {
        log.log('Emitting \'' + msg + '\' to ' + host);
        socket.emit(msg, data, callback);
    } else {
        log.log('Emitting \'' + msg + '\' to ' + host + ' (pending connection)');
        pendingEmits[host].push({ msg: msg, data: data, callback: callback });
    }
}

function invalidateSimHost() {
    // Simulation host is being refreshed, so we'll wait on a new connection.
    hostSockets[SIM_HOST] = null;
}

function closeConnections() {
    Object.keys(hostSockets).forEach(function (hostType) {
        var socket = hostSockets[hostType];
        if (socket) {
            socket.disconnect(true);
        }
    });

    if (io) {
        io.close();
        io = null;
    }

    reset();
}

module.exports.init = init;
module.exports.emitToHost = emitToHost;
module.exports.invalidateSimHost = invalidateSimHost;
module.exports.closeConnections = closeConnections;
