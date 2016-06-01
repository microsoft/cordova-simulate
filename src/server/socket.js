// Copyright (c) Microsoft Corporation. All rights reserved.

/*
 * This module implements communication protocol as described
 */

var log = require('./log'),
    config = require('./config'),
    livereload = require('./live-reload/live-reload-server'),
    telemetry = require('./telemetry-helper'),
    Q = require('q');

// make variable match the literal
var APP_HOST = 'APP_HOST',
    SIM_HOST = 'SIM_HOST',
    DEBUG_HOST = 'DEBUG_HOST';

var hostSockets = {};

var pendingEmits = {};
pendingEmits[APP_HOST] = [];
pendingEmits[SIM_HOST] = [];
pendingEmits[DEBUG_HOST] = [];

var whenAppHostConnected = Q.defer(),
    whenSimHostReady     = Q.defer();

function resetAppHostState() {
    whenAppHostConnected = Q.defer();
    whenAppHostConnected.promise.then(onAppHostConnected);
}

function resetSimHostState() {
    whenSimHostReady = Q.defer();
    whenSimHostReady.promise.then(onSimHostReady);
}

function setupAppHostHandlers() {
    var socket = hostSockets[APP_HOST];
    log.log('Setup handlers for APP_HOST');

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
}

function handleSimHostRegistration(socket) {
    socket.once('ready', handleSimHostReady);
    emitToHost(SIM_HOST, 'init');
}

function onAppHostConnected() {
    var socket = hostSockets.APP_HOST;
    socket.once('app-plugin-list', handleAppPluginList);

    emitToHost(APP_HOST, 'init');
}

function onSimHostReady() {
    setupAppHostHandlers();
}

function handleSimHostReady() {
    // resolving this promise will result in app-host handlers setupp
    whenSimHostReady.resolve();

    setupSimHostHandlers();

    whenAppHostConnected.promise
        .then(onAppHostConnected);
}

function handleAppPluginList(data) {
    whenSimHostReady.promise.then(function () {
        var socket = hostSockets.SIM_HOST;
        socket.once('start', handleStart);

        emitToHost(SIM_HOST, 'app-plugin-list', data);
    });
}

function handleStart() {
    emitToHost(APP_HOST, 'start');
}

function setupSimHostHandlers() {
    log.log('Setup handlers for SIM_HOST');

    var socket = hostSockets.SIM_HOST;

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

    socket.on('debug-message', function (data) {
        emitToHost(DEBUG_HOST, data.message, data.data);
    });

    socket.on('telemetry', function (data) {
        telemetry.handleClientTelemetry(data);
    });

    // Set up telemetry if necessary.
    if (config.telemetry) {
        socket.emit('init-telemetry');
    }

    handlePendingEmits(SIM_HOST);

}

function init(server) {
    var io = require('socket.io')(server);

    io.on('connection', function (socket) {
        socket.on('register-app-host', function () {
            log.log('APP_HOST connected to the server');
            if (hostSockets[APP_HOST]) {
                log.log('Overriding previously connected APP_HOST');
                resetAppHostState();
            }
            hostSockets[APP_HOST] = socket;
            whenSimHostReady.promise
                .then(onSimHostReady);
            whenAppHostConnected.resolve();
        });

        socket.on('register-simulation-host', function () {
            log.log('SIM_HOST connected to the server');
            if (hostSockets[SIM_HOST]) {
                log.log('Overriding previously connected SIM_HOST');
                resetSimHostState();
            }
            hostSockets[SIM_HOST] = socket;
            handleSimHostRegistration(socket);
        });

        socket.on('register-debug-host', function (data) {
            log.log('DEBUG_HOST registered with server.');

            // It only makes sense to have one debug host per server. If more than one tries to connect, always take
            // the most recent.
            hostSockets[DEBUG_HOST] = socket;

            if (data && data.handlers) {
                socket.on('end', function () {
                    config.debugHostHandlers = null;
                });
                config.debugHostHandlers = data.handlers;
            }

            handlePendingEmits(DEBUG_HOST);
        });

        socket.on('disconnect', function () {
            var type;
            Object.keys(hostSockets).forEach(function (t) {
                if (hostSockets[t] === socket) {
                    type = t;
                }
            });
            if (!type) {
                log.log('Disconnect for an inactive socket');
                return;
            }
            hostSockets[type] = undefined;
            log.log(type + ' disconnected to the server');
            switch (type) {
                case APP_HOST:
                    resetAppHostState();
                    break;
                case SIM_HOST:
                    resetSimHostState();
                    break;
            }

        });

    });
}

function handlePendingEmits(host) {
    log.log('Handling pending emits for ' + host);
    pendingEmits[host].forEach(function (pendingEmit) {
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

function subscribeToHost(host, msg, handler, once) {
    var socket = hostSockets[host],
        handler = once ? 'once' : 'on';
    if (socket) {
        socket[handler](msg, handler);
    } else {
        log.log('Subscribing to a disconnected ' + host + ' wanting \'' + msg + '\'');
    }
}


function invalidateSimHost() {
    // Simulation host is being refreshed, so we'll wait on a new connection.
    hostSockets[SIM_HOST] = undefined;
}

module.exports.init = init;
module.exports.emitToHost = emitToHost;
module.exports.invalidateSimHost = invalidateSimHost;
