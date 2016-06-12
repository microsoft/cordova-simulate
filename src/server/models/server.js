// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path'),
    replaceStream = require('replacestream'),
    cordovaServe = require('cordova-serve'),
    send = require('send'),
    url = require('url'),
    dirs = require('./dirs'),
    simFiles = require('./sim-files'),
    simSocket = require('./socket'),
    log = require('./log');

var pluginSimulationFiles = require('./plugin-files');

/**
 * @constructor
 */
function SimulationServer(simulator) {
    this._simulator = simulator;
    this._server = cordovaServe();
}

SimulationServer.prototype.start = function (platform, config, opts) {
    /* attach simulation host middleware */
    var middlewarePath = path.join(config.simHostOptions.simHostRoot, 'server', 'server');
    if (fs.existsSync(middlewarePath + '.js')) {
        require(middlewarePath).attach(this._server.app, dirs);
    }

    /* attach CORS proxy middleware */
    if (config.xhrProxy) {
        require('./server/xhr-proxy').attach(this._server.app);
    }

    this._prepareRoutes();

    return this._server.servePlatform(platform, {
        port: opts.port,
        root: opts.dir,
        noServerInfo: true
    }).then(function () {
        this._trackServerConnections();

        simSocket.init(this._server.server);
        var projectRoot = this._server.projectRoot;
        config.projectRoot = projectRoot;
        config.platformRoot = this._server.root;

        var urlRoot = 'http://localhost:' + this._server.port + '/';
        var appUrl = urlRoot + parseStartPage(projectRoot);
        var simHostUrl = urlRoot + 'simulator/index.html';

        log.log('Server started:\n- App running at: ' + appUrl + '\n- Sim host running at: ' + simHostUrl);

        return {
            urlRoot: urlRoot,
            appUrl: appUrl,
            simHostUrl: simHostUrl
        };
    }.bind(this));
};

/**
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
        this.sendHostJsFile(response, 'app-host');
    }.bind(this));
    app.get('/simulator/sim-host.js', function (request, response) {
        this.sendHostJsFile(response, 'sim-host');
    }.bind(this));
    app.use(this._project.getRouter());
    app.use('/simulator', cordovaServe.static(dirs.hostRoot['sim-host']));
    app.use('/simulator/thirdparty', cordovaServe.static(dirs.thirdParty));
};

SimulationServer.prototype.stop = function () {
    // TODO simSocket.closeConnections();
    this._server.server && this._server.server.close();

    for (var id in this._connections) {
        var socket = this._connections[id];
        socket && socket.destroy();
    }
};

/**
 * @param {object} response
 * @param {string} hostType
 */
SimulationServer.prototype.sendHostJsFile = function (response, hostType) {
    var hostJsFile = simFiles.getHostJsFile(hostType);
    if (!hostJsFile) {
        throw new Error('Path to ' + hostType + '.js has not been set.');
    }
    response.sendFile(hostJsFile);
};

SimulationServer.prototype.streamAppHostHtml = function (request, response) {
    var filePath = path.join(config.platformRoot, url.parse(request.url).pathname);

    if (request.query && request.query['cdvsim-enabled'] === 'false') {
        response.sendFile(filePath);
        return;
    }

    // Always prepare before serving up app HTML file, so app is up-to-date,
    // then create the app-host.js (if it is out-of-date) so it is ready when it is requested.
    var project = this._simulator.project;

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

SimulationServer.prototype.streamSimHostHtml = function (request, response) {
    // If we haven't ever prepared, do so before we try to generate sim-host, so we know our list of plugins is up-to-date.
    // Then create sim-host.js (if it is out-of-date) so it is ready when it is requested.
    var project = this._simulator.project;

    project.prepare().then(function () {
        return simFiles.createSimHostJsFile();
    }).then(function () {
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
        send(request, path.join(dirs.hostRoot['sim-host'], 'sim-host.html'), {
            transform: function (stream) {
                return stream
                    .pipe(replaceStream('<!-- PANELS -->', panelsHtml.join('\n')))
                    .pipe(replaceStream('<!-- DIALOGS -->', dialogsHtml.join('\n')));
            }
        }).pipe(response);
    }).done();
};

/**
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

// TODO
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
    return [/<script[^>]*src\s*=\s*"([^"]*)"[^>]*>/g, /<link[^>]*href\s*=\s*"([^"]*)"[^>]*>/g].reduce(function (result, regex) {
        // Ensures plugin path is prefixed to source of any script and link tags
        return result.replace(regex, function (match, p1) {
            return match.replace(p1, 'plugin/' + pluginId + '/' + p1.trim());
        });
    }, html).replace(/<!\-\-(.|\s)*?\-\->(\s)*/g, function () {
        // Remove comments
        return '';
    });
}

module.exports.SimulationServer = SimulationServer;
