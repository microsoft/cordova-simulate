// Copyright (c) Microsoft Corporation. All rights reserved.

var log = require('./utils/log'),
    LiveReload = require('./live-reload/live-reload');

// make variable match the literal
var APP_HOST = 'APP_HOST',
    SIM_HOST = 'SIM_HOST',
    DEBUG_HOST = 'DEBUG_HOST';

/**
 * SIM_HOST states
 */
var SH_STATE_DISCONNECTED   = 1 << 0,
    SH_STATE_CONNECTED      = 1 << 2,
    SH_STATE_INIT_SENT      = 1 << 3,
    SH_STATE_READY          = 1 << 4;

/**
 * APP_HOST states
 */
var AH_STATE_DISCONNECTED   = 1 << 5,
    AH_STATE_CONNECTED      = 1 << 6,
    AH_STATE_INIT_SENT      = 1 << 7,
    AH_STATE_PLUGINS_READY  = 1 << 8,
    AH_STATE_START_SENT     = 1 << 9;

/**
 * It creates a Web Socket server to enable RPC communication between simulation hosts
 * running in different process. This object implements the server part of the communication
 * protocol as described at
    https://github.com/Microsoft/cordova-simulate/wiki/The-cordova-simulate-bootstrap-protocol
 * with a limitation that only single app-host is supported per server (and sim-host).
 * @param {object} simulatorProxy
 * @param {object} project
 * @constructor
 */
function SocketServer(simulatorProxy, project) {
    this._simulatorProxy = simulatorProxy;
    this._io;
    this._hostSockets = {};
    this._pendingEmits = {};
    this._pendingEmits[APP_HOST] = [];
    this._pendingEmits[SIM_HOST] = [];
    this._pendingEmits[DEBUG_HOST] = [];

    // current client states
    this._ahState = AH_STATE_DISCONNECTED;
    this._shState = SH_STATE_DISCONNECTED;

    var config = this._simulatorProxy.config,
        telemetry = this._simulatorProxy.telemetry;

    this._liveReload = new LiveReload(project, telemetry, config.forcePrepare);
}

/**
 * Handles protocol events triggered by the change of states in one of the
 * clients (APP_HOST or SIM_HOST). Protocol events are those which depend on
 * both APP_HOST and SIM_HOST.
 */
SocketServer.prototype._handleStateChange = function (appHostState, simHostState) {
    var state = appHostState | simHostState;
    switch (state) {
        case AH_STATE_CONNECTED | SH_STATE_READY:
            this._setupAppHostHandlers();
            this._setupSimHostHandlers();
            this._subscribeTo(APP_HOST, 'app-plugin-list', function (data) {
                this._emitTo(SIM_HOST, 'app-plugin-list', data);
                this._setAppHostState(AH_STATE_PLUGINS_READY);
            }.bind(this), true);
            this._emitTo(APP_HOST, 'init');
            this._setAppHostState(AH_STATE_INIT_SENT);
            break;
        case AH_STATE_PLUGINS_READY | SH_STATE_READY:
            this._subscribeTo(SIM_HOST, 'start', function () {
                this._emitTo(APP_HOST, 'start');
                this._setAppHostState(AH_STATE_START_SENT);
            }.bind(this), true);
            break;
        default:
            break;
    }
};

/**
 * Handles state changes in APP_HOST.
 */
SocketServer.prototype._setAppHostState = function (appHostState) {
    switch (appHostState) {
        case AH_STATE_DISCONNECTED:
            if (this._ahState > AH_STATE_DISCONNECTED) {
                this._hostSockets[APP_HOST].disconnect(true);
                delete this._hostSockets[APP_HOST];
            }
            break;
        case AH_STATE_CONNECTED:
            if (this._ahState !== AH_STATE_DISCONNECTED) {
                // TODO: error
            }
            this._hostSockets[APP_HOST] = arguments[1];
            break;
        case AH_STATE_INIT_SENT:
            break;
        case AH_STATE_PLUGINS_READY:
            break;
        case AH_STATE_START_SENT:
            break;
        default:
            // TODO: internal error
            break;
    }

    // see if there's any protocol action to be taken
    this._handleStateChange(appHostState, this._shState);

    this._ahState = appHostState;
};

/**
 * Handles state changes in SIM_HOST.
 */
SocketServer.prototype._setSimHostState = function (simHostState) {
    switch (simHostState) {
        case SH_STATE_DISCONNECTED:
            if (this._shState > SH_STATE_DISCONNECTED) {
                this._hostSockets[SIM_HOST].disconnect(true);
                delete this._hostSockets[SIM_HOST];
            }
            break;
        case SH_STATE_CONNECTED:
            if (this._shState !== SH_STATE_DISCONNECTED) {
                // TODO: error
            }
            this._hostSockets[SIM_HOST] = arguments[1];
            this._handleSimHostRegistration();
            break;
        case SH_STATE_INIT_SENT:
            break;
        case SH_STATE_READY:
            break;
        default:
            // TODO: internal error
            break;
    }

    // see if there's any protocol action to be taken
    this._handleStateChange(this._ahState, simHostState);

    this._shState = simHostState;
};

SocketServer.prototype.init = function (server) {
    var that = this,
        config = this._simulatorProxy.config;

    this._io = require('socket.io')(server);

    this._io.on('connection', function (socket) {
        // Debug messages can be sent to the external debug-host before the app and the simulator are fully ready (for
        // example, during a plugin initialization). For that reason, the debug-message handler should be subscribed to
        // immediately, regardless of which socket type has just connected.
        socket.on('debug-message', function (data) {
            that._emitTo(DEBUG_HOST, data.message, data.data);
        });

        socket.on('register-app-host', function () {
            if (that._ahState > AH_STATE_DISCONNECTED) {
                log.log('Overriding previously connected APP_HOST');
                that._setAppHostState(AH_STATE_DISCONNECTED);
            }
            that._setAppHostState(AH_STATE_CONNECTED, socket);
        });

        socket.on('register-simulation-host', function () {
            if (that._shState > SH_STATE_DISCONNECTED) {
                log.log('Overriding previously connected SIM_HOST');
                that._setSimHostState(SH_STATE_DISCONNECTED);
            }
            that._setSimHostState(SH_STATE_CONNECTED, socket);
        });

        socket.on('register-debug-host', function (data) {
            log.log('DEBUG_HOST registered with server.');

            // It only makes sense to have one debug host per server. If more than one tries to connect, always take
            // the most recent.
            that._hostSockets[DEBUG_HOST] = socket;

            if (data && data.handlers) {
                config.debugHostHandlers = data.handlers;
            }

            that._handlePendingEmits(DEBUG_HOST);
        });

        socket.on('disconnect', function () {
            var type;
            Object.keys(that._hostSockets).forEach(function (t) {
                if (that._hostSockets[t] === socket) {
                    type = t;
                }
            });
            if (!type) {
                log.log('Disconnect for an inactive socket');
                return;
            }
            switch (type) {
                case APP_HOST:
                    that._setAppHostState(AH_STATE_DISCONNECTED);
                    break;
                case SIM_HOST:
                    that._setSimHostState(SH_STATE_DISCONNECTED);
                    break;
                case DEBUG_HOST:
                    config.debugHostHandlers = null;
                    break;
            }
        });
    });
};

SocketServer.prototype.reloadSimHost = function () {
    this._emitTo(SIM_HOST, 'refresh');
};

SocketServer.prototype.closeConnections = function () {
    // stop watching file changes
    if (this._simulatorProxy.config.liveReload) {
        this._liveReload.stop();
    }

    Object.keys(this._hostSockets).forEach(function (hostType) {
        var socket = this._hostSockets[hostType];
        if (socket) {
            socket.disconnect(true);
        }
    }.bind(this));

    // not need to close the server, since it is closed
    // by the SimulationServer instance
    this._io = null;
    this._hostSockets = {};
    this._pendingEmits = {};
    this._pendingEmits[DEBUG_HOST] = [];
};

SocketServer.prototype._setupAppHostHandlers = function () {
    var config = this._simulatorProxy.config;

    this._subscribeTo(APP_HOST, 'exec', function (data) {
        this._emitTo(SIM_HOST, 'exec', data);
    }.bind(this));

    this._subscribeTo(APP_HOST, 'plugin-message', function (data) {
        this._emitTo(SIM_HOST, 'plugin-message', data);
    }.bind(this));

    this._subscribeTo(APP_HOST, 'plugin-method', function (data, callback) {
        this._emitTo(SIM_HOST, 'plugin-method', data, callback);
    }.bind(this));

    // Set up live reload if necessary.
    if (config.liveReload) {
        log.log('Starting live reload.');
        this._liveReload.start(this._hostSockets[APP_HOST]);
    }

    // Set up telemetry if necessary.
    if (config.telemetry) {
        this._subscribeTo(APP_HOST, 'telemetry', function (data) {
            this._simulatorProxy.telemetry.handleClientTelemetry(data);
        }.bind(this));

        this._emitTo(APP_HOST, 'init-telemetry');
    }

    // Set up xhr proxy
    if (config.xhrProxy) {
        this._emitTo(APP_HOST, 'init-xhr-proxy');
    }

    // setup touch events support
    if (config.touchEvents) {
        this._emitTo(APP_HOST, 'init-touch-events');
    }
};

SocketServer.prototype._handleSimHostRegistration = function () {
    this._subscribeTo(SIM_HOST, 'ready', function () {
        this._setSimHostState(SH_STATE_READY);
    }.bind(this), true);
    this._emitTo(SIM_HOST, 'init', this._simulatorProxy.config.deviceInfo);
    this._setSimHostState(SH_STATE_INIT_SENT);
};

SocketServer.prototype._setupSimHostHandlers = function () {
    this._subscribeTo(SIM_HOST, 'exec-success', function (data) {
        this._emitTo(APP_HOST, 'exec-success', data);
    }.bind(this));

    this._subscribeTo(SIM_HOST, 'exec-failure', function (data) {
        this._emitTo(APP_HOST, 'exec-failure', data);
    }.bind(this));

    this._subscribeTo(SIM_HOST, 'plugin-message', function (data) {
        this._emitTo(APP_HOST, 'plugin-message', data);
    }.bind(this));

    this._subscribeTo(SIM_HOST, 'plugin-method', function (data, callback) {
        this._emitTo(APP_HOST, 'plugin-method', data, callback);
    }.bind(this));

    this._subscribeTo(SIM_HOST, 'refresh-app-host', function (device) {
        this._simulatorProxy.updateDevice(device);
        this._emitTo(APP_HOST, 'refresh');
    }.bind(this));

    // Set up telemetry if necessary.
    if (this._simulatorProxy.config.telemetry) {
        this._subscribeTo(SIM_HOST, 'telemetry', function (data) {
            this._simulatorProxy.telemetry.handleClientTelemetry(data);
        }.bind(this));

        this._emitTo(SIM_HOST, 'init-telemetry');
    }
};

/**
 * @private
 */
SocketServer.prototype._handlePendingEmits = function (host) {
    log.log('Handling pending emits for ' + host + '. Total: ' + this._pendingEmits[host].length);
    this._pendingEmits[host].forEach(function (pendingEmit) {
        this._emitTo(host, pendingEmit.msg, pendingEmit.data, pendingEmit.callback);
    }.bind(this));
    this._pendingEmits[host] = [];
};

/**
 * @private
 */
SocketServer.prototype._emitTo = function (host, msg, data, callback) {
    var socket = this._hostSockets[host];
    if (socket) {
        log.log('Emitting \'' + msg + '\' to ' + host);
        socket.emit(msg, data, callback);
    } else {
        log.log('Emitting \'' + msg + '\' to ' + host + ' (pending connection)');
        this._pendingEmits[host].push({ msg: msg, data: data, callback: callback });
    }
};

/**
 * @private
 */
SocketServer.prototype._subscribeTo = function (host, msg, handler, once) {
    var socket = this._hostSockets[host],
        method = once ? 'once' : 'on';
    if (socket) {
        socket.removeListener(msg, handler);
        socket[method](msg, handler);
    } else {
        log.log('Subscribing to a disconnected ' + host + ' wanting \'' + msg + '\'');
    }
};

module.exports = SocketServer;
