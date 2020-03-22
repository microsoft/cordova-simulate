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
    Telemetry = require('./telemetry'),
    device = require('./device'),
    theme = require('./theme');

require('../modules/polyfills');

/**
 * The Simulator model handles the information and state of the simulation. It coordinates
 * all the entities in the simulation in order to start and stop a simulation, as well as
 * getting information of the current state.
 * @param {object} opts Configuration for the current simulation.
 * @constructor
 */
function Simulator(opts) {
    opts = opts || {};

    this._config = parseOptions(opts);
    this._opts = { port: opts.port, dir: opts.dir };
    this._state = Simulator.State.IDLE;

    this.hostRoot = {
        'app-host': path.join(dirs.root, 'app-host')
    };

    var that = this;
    Object.defineProperty(this.hostRoot, 'sim-host', {
        get: function () {
            // Get dynamically so simHostOptions is initialized
            return that._config.simHostOptions.simHostRoot;
        }
    });

    this._telemetry = new Telemetry();

    // create an intermediate object that expose only the
    // required public API for the simulation objects
    var simulatorProxy = {
        config: this.config,
        telemetry: this.telemetry,
        updateDevice: this.updateDevice
    };

    this._createTheme(opts.theme);

    this._project = new Project(simulatorProxy, opts.platform);
    this._server = new SimulationServer(simulatorProxy, this._project, this.hostRoot, this._config);

    this._telemetry.initialize(this._project, this._config.telemetry);
}

Object.defineProperties(Simulator.prototype, {
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
 * Check if the simulation is not active.
 * @return {boolean} True if it is not active, otherwise false.
 */
Simulator.prototype.isIdle = function () {
    return this._state === Simulator.State.IDLE;
};

/**
 * Check if the simulation is any active state.
 * @return {boolean} True if it is active, otherwise false.
 */
Simulator.prototype.isActive = function () {
    return this._state !== Simulator.State.IDLE;
};

/**
 * Check if the simulation has successfully started and is running.
 * @return {boolean} True if it is running, otherwise false.
 */
Simulator.prototype.isRunning = function () {
    return this._state === Simulator.State.RUNNING;
};

/**
 * @return {string|null}
 */
Simulator.prototype.urlRoot = function () {
    var urls = this._server.urls;

    return urls ? urls.root : null;
};

/**
 * @return {string|null}
 */
Simulator.prototype.appUrl = function () {
    var urls = this._server.urls;

    return urls ? urls.app : null;
};

/**
 * @return {string|null}
 */
Simulator.prototype.simHostUrl = function () {
    var urls = this._server.urls;

    return urls ? urls.simHost : null;
};

/**
 * Start the simulation for the current project with the provided information at the
 * time of creating the instance.
 * @param {object} opts Optional configuration, such as port number, dir and simulation path.
 * @return {Promise} A promise that is fulfilled when the simulation starts and the server
 * is ready listening for new connections. If something fails, it is rejected.
 */
Simulator.prototype.startSimulation = function () {
    if (this.isActive()) {
        return Q.reject('Simulation is active');
    }

    this._state = Simulator.State.STARTING;

    return this._server.start(this._project.platform, this._opts)
        .then(function (data) {
            // configure project
            this._project.projectRoot = data.projectRoot;
            this._project.platformRoot = data.root;

            // configure simulation file path
            var simPath = this._config.simulationFilePath || path.join(this._project.projectRoot, 'simulation'),
                simulationFilePath = path.resolve(simPath);

            this._config.simulationFilePath = simulationFilePath;

            if (!fs.existsSync(simulationFilePath)) {
                utils.makeDirectoryRecursiveSync(simulationFilePath);
            }

            this._state = Simulator.State.RUNNING;
        }.bind(this))
        .catch(function (error) {
            log.warning('Error starting the simulation');

            this._state = Simulator.State.IDLE;
            throw error;
        }.bind(this));
};

/**
 * Stops the current simulation if any.
 * @return {Promise} A promise that is fulfilled when the simulation stops and the server
 * release the current connections. If something fails, it is rejected.
 */
Simulator.prototype.stopSimulation = function () {
    if (!this.isRunning()) {
        return Q.reject('Simulation is not running');
    }

    this._state = Simulator.State.STOPPING;

    return this._server.stop()
        .then(function () {
            this._project.reset();
            this._state = Simulator.State.IDLE;
        }.bind(this));
};

/**
 * Specify a new device to be used next time the app is restarted (affects user agent).
 * @param newDevice
 */
Simulator.prototype.updateDevice = function (newDevice) {
    this.config.deviceInfo = device.updateDeviceInfo(newDevice);
};

Simulator.prototype.updateTheme = function (themeData) {
    this._createTheme(themeData);
    if (this._server && this._server.simSocket) {
        this._server.simSocket.rethemeSimHost();
    }
};

Simulator.prototype._createTheme = function (themeData) {
    this._config.theme = theme.createTheme(this.hostRoot['sim-host'], themeData);   
};

/**
 * Parse the options provided and create the configuration instance for the current
 * simulation.
 * @param {object} opts Configuration provided for the simulator.
 * @return {Configuration} A configuration instance.
 * @private
 */
function parseOptions(opts) {
    opts = opts || {};

    var simHostOpts,
        config = new Configuration();

    if (opts.simhostui && fs.existsSync(opts.simhostui)) {
        simHostOpts = { simHostRoot: opts.simhostui };
    } else {
        /* use the default simulation UI */
        simHostOpts = { simHostRoot: path.join(__dirname, '..', 'sim-host', 'ui') };
    }
    simHostOpts.title = opts.simhosttitle || 'Plugin Simulation';

    config.simHostOptions = simHostOpts;
    config.simulationFilePath = opts.simulationpath;
    config.telemetry = opts.telemetry;
    config.liveReload = opts.hasOwnProperty('livereload') ? !!opts.livereload : true;
    config.forcePrepare = !!opts.forceprepare;
    config.xhrProxy = opts.hasOwnProperty('corsproxy') ? !!opts.corsproxy : true;
    config.touchEvents = opts.hasOwnProperty('touchevents') ? !!opts.touchevents : true;
    config.middleware = opts.middleware;
    config.lang = normalizeLanguage(opts.lang);

    config.deviceInfo = device.getDeviceInfo(opts.platform, opts.device);
    opts.platform = config.deviceInfo.platform;

    return config;
}

function normalizeLanguage(lang) {
    // Tries to find the best match for the provided language

    if (!lang) {
        return null;
    }

    lang = lang.toLowerCase();

    // This list matches the case of the relevant directory names, which is important for systems with case sensitive
    // file systems.
    var supportedLangs = ['zh-Hans', 'zh-Hant', 'cs', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tr'];

    // Look for exact match (case insensitive)
    var idx = supportedLangs.map(function (lang) {
        return lang.toLowerCase();
    }).indexOf(lang);

    if (idx == -1) {
        // That didn't match, so try to match just the language
        idx = supportedLangs.map(function (lang) {
            return lang.split('-')[0];
        }).indexOf(lang.split('-')[0]);
    }

    return idx > -1 ? supportedLangs[idx] : null;
}

module.exports = Simulator;
