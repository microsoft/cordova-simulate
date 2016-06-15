// Copyright (c) Microsoft Corporation. All rights reserved.

var log = require('./utils/log'),
    LiveReload = require('./live-reload/live-reload-server');

var APP_HOST = 'app-host';
var SIM_HOST = 'sim-host';
var DEBUG_HOST = 'debug-host';

/**
 * @constructor
 */
function SocketServer(simulator) {
    this._simulator = simulator;
    this._io;
    this._hostSockets = {};
    this._pendingEmits = {};
    this._pendingEmits[APP_HOST] = [];
    this._pendingEmits[SIM_HOST] = [];
    this._pendingEmits[DEBUG_HOST] = [];

    var config = this._simulator.config,
        project = this._simulator.project,
        telemetry = this._simulator.telemetry;

    this._liveReload = new LiveReload(project, telemetry, config.forcePrepare);
}

SocketServer.prototype.init = function (server) {
    var that = this,
        telemetry = this._simulator.telemetry,
        config = this._simulator.config;

    this._io = require('socket.io')(server);

    this._io.on('connection', function (socket) {
        socket.on('register-app-host', function () {
            log.log('App-host registered with server.');

            // It only makes sense to have one app host per server. If more than one tries to connect, always take the
            // most recent.
            this._hostSockets[APP_HOST] = socket;

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
                telemetry.handleClientTelemetry(data);
            });

            socket.on('debug-message', function (data) {
                that.emitToHost(DEBUG_HOST, data.message, data.data);
            });

            // Set up live reload if necessary.
            if (config.liveReload) {
                log.log('Starting live reload.');
                that._liveReload.start(socket);
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

            this._handlePendingEmits(APP_HOST);
        }.bind(this));

        socket.on('register-simulation-host', function () {
            log.log('Simulation host registered with server.');

            // It only makes sense to have one simulation host per server. If more than one tries to connect, always
            // take the most recent.
            this._hostSockets[SIM_HOST] = socket;

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
                telemetry.handleClientTelemetry(data);
            });

            socket.on('debug-message', function (data) {
                that.emitToHost(DEBUG_HOST, data.message, data.data);
            });

            // Set up telemetry if necessary.
            if (config.telemetry) {
                socket.emit('init-telemetry');
            }

            this._handlePendingEmits(SIM_HOST);
        }.bind(this));

        socket.on('register-debug-host', function (data) {
            log.log('Debug-host registered with server.');

            // It only makes sense to have one debug host per server. If more than one tries to connect, always take
            // the most recent.
            this._hostSockets[DEBUG_HOST] = socket;

            if (data && data.handlers) {
                socket.on('disconnect', function () {
                    log.log('Debug-host disconnected.');
                    config.debugHostHandlers = null;
                });
                config.debugHostHandlers = data.handlers;
            }

            this._handlePendingEmits(DEBUG_HOST);
        }.bind(this));
    }.bind(this));
};

/**
 * @param {string} host
 * @param {string} msg
 * @param {object} data
 * @param {Function} callback
 */
SocketServer.prototype.emitToHost = function (host, msg, data, callback) {
    var socket = this._hostSockets[host];
    if (socket) {
        log.log('Emitting \'' + msg + '\' to ' + host);
        socket.emit(msg, data, callback);
    } else {
        log.log('Emitting \'' + msg + '\' to ' + host + ' (pending connection)');
        this._pendingEmits[host].push({ msg: msg, data: data, callback: callback });
    }
};

SocketServer.prototype.invalidateSimHost = function () {
    // Simulation host is being refreshed, so we'll wait on a new connection.
    this._hostSockets[SIM_HOST] = null;
};

SocketServer.prototype.closeConnections = function () {
    // stop watching file changes
    if (this._simulator._config.liveReload) {
        this._liveReload.stop();
    }

    Object.keys(this._hostSockets).forEach(function (hostType) {
        var socket = this._hostSockets[hostType];
        if (socket) {
            socket.disconnect(true);
        }
    }.bind(this));

    if (this._io) {
        // not need to close the server, since it is closed
        // by the SimulationServer instance
        this._io = null;
    }

    this._hostSockets = {};
    this._pendingEmits = {};
    this._pendingEmits[APP_HOST] = [];
    this._pendingEmits[SIM_HOST] = [];
    this._pendingEmits[DEBUG_HOST] = [];
};

/**
 * @param {string} host
 */
SocketServer.prototype._handlePendingEmits = function (host) {
    this._pendingEmits[host].forEach(function (pendingEmit) {
        log.log('Handling pending emit \'' + pendingEmit.msg + '\' to ' + host);
        this.emitToHost(host, pendingEmit.msg, pendingEmit.data, pendingEmit.callback);
    }.bind(this));
    this._pendingEmits[host] = [];
};

module.exports = SocketServer;
