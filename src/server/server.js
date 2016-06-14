// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path'),
    replaceStream = require('replacestream'),
    cordovaServe = require('cordova-serve'),
    send = require('send'),
    url = require('url'),
    Q = require('q'),
    dirs = require('./dirs'),
    log = require('./utils/log'),
    SimulationFiles = require('./sim-files'),
    SocketServer = require('./socket');

var pluginSimulationFiles = require('./plugin-files');

/**
 * The simulation server that encapsulates the HTTP server instance and
 * Web Socket server. It enables to start and stop the server to listening
 * for new connections.
 * @param {object} simulator
 * @constructor
 */
function SimulationServer(simulator) {
    this._simulator = simulator;
    this._server = cordovaServe();
    this._simulationFiles = new SimulationFiles(simulator);
    this._simSocket = new SocketServer(simulator);
}

Object.defineProperties(SimulationServer.prototype, {
    server: {
        get: function () {
            return this._server;
        }
    },
    simSocket: {
        get: function () {
            return this._simSocket;
        }
    }
});

SimulationServer.prototype.start = function (platform, config, opts) {
    /* attach simulation host middleware */
    var middlewarePath = path.join(config.simHostOptions.simHostRoot, 'server', 'server');
    if (fs.existsSync(middlewarePath + '.js')) {
        require(middlewarePath).attach(this._server.app, dirs);
    }

    /* attach CORS proxy middleware */
    if (config.xhrProxy) {
        require('./xhr-proxy').attach(this._server.app);
    }

    this._prepareRoutes();

    return this._server.servePlatform(platform, {
        port: opts.port,
        root: opts.dir,
        noServerInfo: true
    }).then(function () {
        this._trackServerConnections();
        this._simSocket.init(this._server.server, this._simulator._config);

        var projectRoot = this._server.projectRoot,
            urlRoot = 'http://localhost:' + this._server.port + '/',
            appUrl = urlRoot + parseStartPage(projectRoot),
            simHostUrl = urlRoot + 'simulator/index.html';

        log.log('Server started:\n- App running at: ' + appUrl + '\n- Sim host running at: ' + simHostUrl);

        return {
            urlRoot: urlRoot,
            appUrl: appUrl,
            simHostUrl: simHostUrl
        };
    }.bind(this));
};

/**
 * Stop the simulation server by closing the server and destroy active connections.
 * @return {Promise} A promise that is resolved once the server has been closed.
 */
SimulationServer.prototype.stop = function () {
    var deferred = Q.defer(),
        promise = deferred.promise;

    this._simSocket.closeConnections();

    this._server.server.close(function () {
        deferred.resolve();
    });

    for (var id in this._connections) {
        var socket = this._connections[id];
        socket && socket.destroy();
    }

    this._connections = {};

    return promise;
};

/**
 * Define the routes for the current express app to the simulation files.
 * @private
 */
SimulationServer.prototype._prepareRoutes = function () {
    var app = this._server.app;

    var streamSimHostHtml = this._streamSimHostHtml.bind(this),
        streamAppHostHtml = this._streamAppHostHtml.bind(this);

    app.get('/simulator/', streamSimHostHtml);
    app.get('/simulator/*.html', streamSimHostHtml);
    app.get('/', streamAppHostHtml);
    app.get('/*.html', streamAppHostHtml);
    app.get('/simulator/app-host.js', function (request, response) {
        this._sendHostJsFile(response, 'app-host');
    }.bind(this));
    app.get('/simulator/sim-host.js', function (request, response) {
        this._sendHostJsFile(response, 'sim-host');
    }.bind(this));
    app.use(this._simulator.project.getRouter());
    app.use('/simulator', cordovaServe.static(this._simulator.hostRoot['sim-host']));
    app.use('/simulator/thirdparty', cordovaServe.static(dirs.thirdParty));
};

/**
 * @param {object} response
 * @param {string} hostType
 * @private
 */
SimulationServer.prototype._sendHostJsFile = function (response, hostType) {
    var hostJsFile = this._simulationFiles.getHostJsFile(hostType);
    if (!hostJsFile) {
        throw new Error('Path to ' + hostType + '.js has not been set.');
    }
    response.sendFile(hostJsFile);
};

/**
 * @param {object} request
 * @param {object} response
 * @private
 */
SimulationServer.prototype._streamAppHostHtml = function (request, response) {
    var project = this._simulator._project;
    var filePath = path.join(project.platformRoot, url.parse(request.url).pathname);

    if (request.query && request.query['cdvsim-enabled'] === 'false') {
        response.sendFile(filePath);
        return;
    }

    // Always prepare before serving up app HTML file, so app is up-to-date,
    // then create the app-host.js (if it is out-of-date) so it is ready when it is requested.
    var simFiles = this._simulationFiles;

    project.prepare().then(function () {
        return simFiles.createAppHostJsFile();
    }).then(function (pluginList) {
        // Sim host will need to be refreshed if the plugin list has changed.
        simFiles.validateSimHostPlugins(pluginList);

        // Inject plugin simulation app-host <script> references into *.html
        log.log('Injecting app-host into ' + filePath);
        var scriptSources = [
            '/simulator/thirdparty/socket.io-1.2.0.js',
            '/simulator/app-host.js'
        ];
        var scriptTags = scriptSources.map(function (scriptSource) {
            return '<script src="' + scriptSource + '"></script>';
        }).join('');

        // Note we replace "default-src 'self'" with "default-src 'self' ws:" (in Content Security Policy) so that
        // websocket connections are allowed (this relies on a custom version of send that supports a 'transform' option).
        send(request, filePath, {
            transform: function (stream) {
                return stream
                    .pipe(replaceStream(/<\s*head\s*>/, '<head>' + scriptTags))
                    .pipe(replaceStream('default-src \'self\'', 'default-src \'self\' ws: blob:'));
            }
        }).pipe(response);
    }).done();
};

/**
 * @param {object} request
 * @param {object} response
 * @private
 */
SimulationServer.prototype._streamSimHostHtml = function (request, response) {
    // If we haven't ever prepared, do so before we try to generate sim-host, so we know our list of plugins is up-to-date.
    // Then create sim-host.js (if it is out-of-date) so it is ready when it is requested.
    var project = this._simulator.project;

    project.prepare().then(function () {
        return this._simulationFiles.createSimHostJsFile();
    }.bind(this)).then(function () {
        // Inject references to simulation HTML files
        var panelsHtmlBasename = pluginSimulationFiles['sim-host']['panels'];
        var dialogsHtmlBasename = pluginSimulationFiles['sim-host']['dialogs'];
        var panelsHtml = [];
        var dialogsHtml = [];

        var pluginList = project.getPlugins();

        Object.keys(pluginList).forEach(function (pluginId) {
            var pluginPath = pluginList[pluginId];
            if (pluginPath) {
                var panelsHtmlFile = path.join(pluginPath, panelsHtmlBasename);
                if (fs.existsSync(panelsHtmlFile)) {
                    panelsHtml.push(processPluginHtml(fs.readFileSync(panelsHtmlFile, 'utf8'), pluginId));
                }

                var dialogsHtmlFile = path.join(pluginPath, dialogsHtmlBasename);
                if (fs.existsSync(dialogsHtmlFile)) {
                    dialogsHtml.push(processPluginHtml(fs.readFileSync(dialogsHtmlFile, 'utf8'), pluginId));
                }
            }
        });

        // Note that this relies on a custom version of send that supports a 'transform' option.
        send(request, path.join(this._simulator.hostRoot['sim-host'], 'sim-host.html'), {
            transform: function (stream) {
                return stream
                    .pipe(replaceStream('<!-- PANELS -->', panelsHtml.join('\n')))
                    .pipe(replaceStream('<!-- DIALOGS -->', dialogsHtml.join('\n')));
            }
        }).pipe(response);
    }.bind(this)).done();
};

/**
 * Keep track of the clients connected to the server. When a new client is connected,
 * assign an ID and listen for the close event, to remove it from the tracked active
 * connections.
 * The connections are tracked in order to force to close the active ones, when the
 * server is closed.
 * @private
 */
SimulationServer.prototype._trackServerConnections = function () {
    var nextId = 0;
    this._connections = {};

    this._server.server.on('connection', function (socket) {
        var id = nextId++;
        this._connections[id] = socket;

        socket.on('close', function () {
            delete this._connections[id];
        }.bind(this));
    }.bind(this));
};

var parseStartPage = function (projectRoot) {
    // Start Page is defined as <content src="some_uri" /> in config.xml
    var configFile = path.join(projectRoot, 'config.xml');
    if (!fs.existsSync(configFile)) {
        throw new Error('Cannot find project config file: ' + configFile);
    }

    var startPageRegexp = /<content\s+src\s*=\s*"(.+)"\s*\/>/ig,
        configFileContent = fs.readFileSync(configFile);

    var match = startPageRegexp.exec(configFileContent);
    if (match) {
        return match[1];
    }

    return 'index.html'; // default uri
};

function processPluginHtml(html, pluginId) {
    var tags = [
        /<script[^>]*src\s*=\s*"([^"]*)"[^>]*>/g,
        /<link[^>]*href\s*=\s*"([^"]*)"[^>]*>/g
    ];

    return tags.reduce(function (result, regex) {
        // Ensures plugin path is prefixed to source of any script and link tags
        return result.replace(regex, function (match, p1) {
            return match.replace(p1, 'plugin/' + pluginId + '/' + p1.trim());
        });
    }, html).replace(/<!\-\-(.|\s)*?\-\->(\s)*/g, function () {
        // Remove comments
        return '';
    });
}

module.exports = SimulationServer;
