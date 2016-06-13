// Copyright (c) Microsoft Corporation. All rights reserved.

var log = require('./utils/log');
    // TODO livereload = require('./live-reload/live-reload-server'),
    // TODO telemetry = require('./telemetry-helper');

var APP_HOST = 'app-host';
var SIM_HOST = 'sim-host';
var DEBUG_HOST = 'debug-host';

/**
 * @constructor
 */
function SocketServer(simulator) {
    this._simulator = simulator;
    this.io;
    this.hostSockets = {};
    this.pendingEmits = {};
    this.pendingEmits[APP_HOST] = [];
    this.pendingEmits[SIM_HOST] = [];
    this.pendingEmits[DEBUG_HOST] = [];
}

SocketServer.prototype.reset = function () {
    this.hostSockets = {};
    this.pendingEmits = {};
    this.pendingEmits[APP_HOST] = [];
    this.pendingEmits[SIM_HOST] = [];
    this.pendingEmits[DEBUG_HOST] = [];
};

SocketServer.prototype.init = function (server, config) {
    // this.reset();
    var that = this;
    this.io = require('socket.io')(server);

    this.io.on('connection', function (socket) {
        socket.on('register-app-host', function () {
            log.log('App-host registered with server.');

            // It only makes sense to have one app host per server. If more than one tries to connect, always take the
            // most recent.
            this.hostSockets[APP_HOST] = socket;

            socket.on('exec', function (data) {
                that.emitToHost(SIM_HOST, 'exec', data);
            });

            socket.on('plugin-message', function (data) {
                that.emitToHost(SIM_HOST, 'plugin-message', data);
            });

            socket.on('plugin-method', function (data, callback) {
                that.emitToHost(SIM_HOST, 'plugin-method', data, callback);
            });

            socket.on('telemetry', function (data) {
                // TODO telemetry.handleClientTelemetry(data);
            });

            socket.on('debug-message', function (data) {
                that.emitToHost(DEBUG_HOST, data.message, data.data);
            });

            // Set up live reload if necessary.
            if (config.liveReload) {
                log.log('Starting live reload.');
                // TODO livereload.init(socket);
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

            this.handlePendingEmits(APP_HOST);
        }.bind(this));

        socket.on('register-simulation-host', function () {
            log.log('Simulation host registered with server.');

            // It only makes sense to have one simulation host per server. If more than one tries to connect, always
            // take the most recent.
            this.hostSockets[SIM_HOST] = socket;

            socket.on('exec-success', function (data) {
                that.emitToHost(APP_HOST, 'exec-success', data);
            });
            socket.on('exec-failure', function (data) {
                that.emitToHost(APP_HOST, 'exec-failure', data);
            });

            socket.on('plugin-message', function (data) {
                that.emitToHost(APP_HOST, 'plugin-message', data);
            });

            socket.on('plugin-method', function (data, callback) {
                that.emitToHost(APP_HOST, 'plugin-method', data, callback);
            });

            socket.on('telemetry', function (data) {
                // TODO telemetry.handleClientTelemetry(data);
            });

            socket.on('debug-message', function (data) {
                that.emitToHost(DEBUG_HOST, data.message, data.data);
            });

            // Set up telemetry if necessary.
            if (config.telemetry) {
                socket.emit('init-telemetry');
            }

            this.handlePendingEmits(SIM_HOST);
        }.bind(this));

        socket.on('register-debug-host', function (data) {
            log.log('Debug-host registered with server.');

            // It only makes sense to have one debug host per server. If more than one tries to connect, always take
            // the most recent.
            this.hostSockets[DEBUG_HOST] = socket;

            if (data && data.handlers) {
                socket.on('disconnect', function () {
                    log.log('Debug-host disconnected.');
                    config.debugHostHandlers = null;
                });
                config.debugHostHandlers = data.handlers;
            }

            this.handlePendingEmits(DEBUG_HOST);
        }.bind(this));
    }.bind(this));
};

/**
 * @param {string} host
 */
SocketServer.prototype.handlePendingEmits = function (host) {
    this.pendingEmits[host].forEach(function (pendingEmit) {
        log.log('Handling pending emit \'' + pendingEmit.msg + '\' to ' + host);
        this.emitToHost(host, pendingEmit.msg, pendingEmit.data, pendingEmit.callback);
    }.bind(this));
    this.pendingEmits[host] = [];
};

/**
 * @param {string} host
 * @param {string} msg
 * @param {object} data
 * @param {Function} callback
 */
SocketServer.prototype.emitToHost = function (host, msg, data, callback) {
    var socket = this.hostSockets[host];
    if (socket) {
        log.log('Emitting \'' + msg + '\' to ' + host);
        socket.emit(msg, data, callback);
    } else {
        log.log('Emitting \'' + msg + '\' to ' + host + ' (pending connection)');
        this.pendingEmits[host].push({ msg: msg, data: data, callback: callback });
    }
};

SocketServer.prototype.invalidateSimHost = function () {
    // Simulation host is being refreshed, so we'll wait on a new connection.
    this.hostSockets[SIM_HOST] = null;
};

SocketServer.prototype.closeConnections = function () {
    Object.keys(this.hostSockets).forEach(function (hostType) {
        var socket = this.hostSockets[hostType];
        if (socket) {
            socket.disconnect(true);
        }
    }.bind(this));

    if (this.io) {
        this.io.close();
        this.io = null;
    }

    // reset();
};

module.exports = SocketServer;
