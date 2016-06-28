// Copyright (c) Microsoft Corporation. All rights reserved.

var Q = require('q'),
    fs = require('fs'),
    path = require('path'),
    log = require('./utils/log'),
    dirs = require('./dirs'),
    utils = require('./utils/jsUtils'),
    Configuration = require('./config'),
    Project = require('./project'),
    SimulationServer = require('./server'),
    Telemetry = require('./telemetry');

/**
 * @param {object} opts Configuration for the current simulation.
 * @constructor
 */
function Simulator(opts) {
    this._config = this._parseOptions(opts);
    this._state = Simulator.State.IDLE;
    this._urls = null;

    this.hostRoot = {
        'app-host':  path.join(dirs.root, 'app-host')
    };

    var simHostOptions = this._config.simHostOptions;
    Object.defineProperty(this.hostRoot, 'sim-host', {
        get: function () {
            // Get dynamically so simHostOptions is initialized
            return simHostOptions.simHostRoot;
        }
    });

    var platform = opts.platform || 'browser';

    this._telemetry = new Telemetry(this, this._config.telemetry);
    this._project = new Project(this, platform);
    this._server = new SimulationServer(this);
}

Object.defineProperties(Simulator.prototype, {
    'urls': {
        get: function () {
            return this._urls;
        }
    },
    'project': {
        get: function () {
            return this._project;
        }
    },
    'config': {
        get: function () {
            return this._config;
        }
    },
    'telemetry': {
        get: function () {
            return this._telemetry;
        }
    }
});

Simulator.State = {
    IDLE: 'IDLE',
    STARTING: 'STARTING',
    RUNNING: 'RUNNING',
    STOPPING: 'STOPPING'
};

/**
 * Parse the options provided and create the configuration instance for the current
 * simulation.
 * @param {object} opts Configuration provided for the simulator.
 * @return {Configuration} A configuration instance.
 * @private
 */
Simulator.prototype._parseOptions = function (opts) {
    opts = opts || {};

    var simHostOpts,
        config = new Configuration();

    if (opts.simhostui && fs.existsSync(opts.simhostui)) {
        simHostOpts = { simHostRoot: opts.simhostui };
    } else {
        /* use the default simulation UI */
        simHostOpts = { simHostRoot: path.join(__dirname, '..', 'sim-host', 'ui') };
    }

    config.simHostOptions = simHostOpts;
    config.telemetry = opts.telemetry;
    config.liveReload = opts.hasOwnProperty('livereload') ? !!opts.livereload : true;
    config.forcePrepare = !!opts.forceprepare;
    config.xhrProxy = opts.hasOwnProperty('corsproxy') ? !!opts.corsproxy : true;
    config.touchEvents = opts.hasOwnProperty('touchevents') ? !!opts.touchevents : true;

    return config;
};

/**
 * Check if the simulation is any active state.
 * @return {boolean} True if it is active, otherwise false.
 */
Simulator.prototype.isActive = function () {
    return this._state !== Simulator.State.IDLE;
};

/**
 * Check if the simulation is not active.
 * @return {boolean} True if it is not active, otherwise false.
 */
Simulator.prototype.isIdle = function () {
    return this._state === Simulator.State.IDLE;
};

Simulator.prototype.urlRoot = function () {
    return this._urls ? this._urls.urlRoot : null;
};

Simulator.prototype.appUrl = function () {
    return this._urls ? this._urls.appUrl : null;
};

Simulator.prototype.simHostUrl = function () {
    return this._urls ? this._urls.simHostUrl : null;
};

/**
 * Start the simulation for the current project with the provided information at the
 * time of creating the instance.
 * @param {object} opts Optional configuration, such as port number, dir and simulation path.
 * @return {Promise} A promise that is fullfilled when the simulation starts and the server
 * is ready listeninig for new connections. If something fails, it is rejected.
 */
Simulator.prototype.startSimulation = function (opts) {
    if (this.isActive()) {
        return Q.reject('Simulation is active');
    }

    this._state = Simulator.State.STARTING;

    return this._server.start(this._project.platform, this._config, opts)
        .then(function (urls) {
            this._urls = urls;

            // configure project
            var server = this._server.server;
            this._project.projectRoot = server.projectRoot;
            this._project.platformRoot = server.root;

            // configure simulation file path
            var simPath = opts.simulationpath || path.join(this._project.projectRoot, 'simulation');
            this._config.simulationFilePath = path.resolve(simPath);

            if (!fs.existsSync(this._config.simulationFilePath)) {
                utils.makeDirectoryRecursiveSync(this._config.simulationFilePath);
            }

            this._state = Simulator.State.RUNNING;
        }.bind(this))
        .fail(function (error) {
            log.warning('Error starting the simulation');
            log.error(error);
        }.bind(this));
};

/**
 * Stops the current simulation if any.
 * @return {Promise} A promise that is fullfilled when the simulation stops and the server
 * release the current connections. If something fails, it is rejected.
 */
Simulator.prototype.stopSimulation = function () {
    if (!this.isActive()) {
        return Q.reject('Simulation is not active');
    }

    this._state = Simulator.State.STOPPING;

    return this._server.stop()
        .then(function () {
            this._state = Simulator.State.IDLE;
        }.bind(this));
};

module.exports = Simulator;
