// Copyright (c) Microsoft Corporation. All rights reserved.

var Q = require('q');

var Project = require('./project'),
    SimulationServer = require('./server');

/**
 * @constructor
 */
function Simulator(opts) {
    this._config = this._parseOptions(opts);

    // TODO keep opts for port and dir

    this._project = new Project(this); // TODO pass projectRoot, etc etc etc
    this._server = new SimulationServer(this);
    this._state = Simulator.State.IDLE;
    this._urlRoot = null;
    this._appUrl = null;
    this._simHostUrl = null;

    this._project.configureSimulationDirectory(opts.simulationpath);
}

Object.defineProperties(Simulator.prototype, {
    'urlRoot': {
        get: function () {
            return this._urlRoot;
        }
    },
    'appUrl': {
        get: function () {
            return this._appUrl;
        }
    },
    'simHostUrl': {
        get: function () {
            return this._simHostUrl;
        }
    },
    'project': {
        get: function () {
            return this._project;
        }
    }
});

Simulator.State = {
    IDLE: 'IDLE',
    STARTING: 'STARTING',
    RUNNING: 'RUNNING',
    STOPPING: 'STOPPING'
};

Simulator.prototype._parseOptions = function (opts) {
    opts = opts || {};

    var simHostOpts,
        config = {};

    if (opts.simhostui && fs.existsSync(opts.simhostui)) {
        simHostOpts = { simHostRoot: opts.simhostui };
    } else {
        /* use the default simulation UI */
        simHostOpts = { simHostRoot: path.join(__dirname, 'sim-host', 'ui') };
    }

    config.platform = opts.platform || 'browser';
    config.simHostOptions = simHostOpts;
    config.telemetry = opts.telemetry;
    config.liveReload = opts.hasOwnProperty('livereload') ? !!opts.livereload : true;
    config.forcePrepare = !!opts.forceprepare;
    config.xhrProxy = opts.hasOwnProperty('corsproxy') ? !!opts.corsproxy : true;
    config.touchEvents = opts.hasOwnProperty('touchevents') ? !!opts.touchevents : true;

    return config;
};

Simulator.prototype.isActive = function () {
    return this._state !== Simulator.State.IDLE;
};

Simulator.prototype.isIdle = function () {
    return this._state === Simulator.State.IDLE;
};

Simulator.prototype.startSimulation = function () {
    if (this.isActive()) {
        return Q.reject('Simulation is active');
    }

    this._state = Simulator.State.STARTING;

    return this._server.start(config.platform, config, opts)
        .then(function (urls) {
            this._urlRoot = urls.urlRoot;
            this._appUrl = urls.appUrl;
            this._simHostUrl = urls.simHostUrl;

            this._state = Simulator.State.RUNNING;
        }.bind(this))
        .fail(function (error) {
            // TODO
        }.bind(this));
};

Simulator.prototype.stopSimulation = function () {
    if (!this.isActive()) {
        return Q.reject('Simulation is not active');
    }

    this._state = Simulator.State.STOPPING;

    return this._server.stop()
        .then(function () {
            this._state = Simulator.State.IDLE;
        }.bind(this))
        .fail(function () {
            // TODO
        }.bind(this));
};

module.exports = Simulator;
