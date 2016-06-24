// Copyright (c) Microsoft Corporation. All rights reserved.

var browserify = require('browserify'),
    fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    through = require('through2'),
    dirs = require('./dirs'),
    jsUtils = require('./utils/jsUtils'),
    log = require('./utils/log'),
    pluginSimulationFiles = require('./plugin-files');

var _browserifySearchPaths = null,
    _commonModules = null,
    simHost = 'sim-host',
    appHost = 'app-host';

/**
 * @constructor
 */
function SimulationFiles(simulator, simServer) {
    this._simulator = simulator;
    this._simServer = simServer;
    this._hostJsFiles = {};
    this._builtOnce = {};
    this._appHostJsPromise = null;
}

function loadJsonFile(file) {
    return JSON.parse(fs.readFileSync(file).toString());
}

/**
 * @return {Promise}
 */
SimulationFiles.prototype.createSimHostJsFile = function () {
    // Don't create sim-host.js until we've created app-host.js at least once, so we know we're working with the same
    // list of plugins.
    return this._waitOnAppHostJs().then(function (appHostPlugins) {
        try {
            return this._createHostJsFile(simHost, ['js', 'handlers'], appHostPlugins);
        } catch (e) {
            console.log('ERROR CREATING SIM-HOST.JS:\n' + e.stack);
        }
    }.bind(this));
};

/**
 * @return {Promise}
 */
SimulationFiles.prototype.createAppHostJsFile = function () {
    var project = this._simulator.project;

    this._appHostJsPromise = this._appHostJsPromise || project.prepare().then(function () {
        return this._createHostJsFile(appHost, ['js', 'handlers', 'clobbers']);
    }.bind(this)).then(function (pluginList) {
        this._appHostJsPromise = null;
        return pluginList;
    }.bind(this));

    return this._appHostJsPromise;
};

/**
 * @param {Array} pluginList
 */
SimulationFiles.prototype.validateSimHostPlugins = function (pluginList) {
    // App-host has been refreshed. If plugins have changed, notify sim-host that is should also refresh (but only bother
    // doing this if we have ever created sim-host).
    var project = this._simulator.project;
    var simulationFilePath = project.simulationFilePath;

    if (this._builtOnce[simHost] && !validatePlugins(simHost, pluginList, simulationFilePath)) {
        var simSocket = this._simServer.simSocket;
        simSocket.reloadSimHost();
    }
};

/**
 * @param {string} hostType
 * @return {string}
 */
SimulationFiles.prototype.getHostJsFile = function (hostType) {
    if (!this._hostJsFiles[hostType]) {
        var project = this._simulator.project;

        this._hostJsFiles[hostType] = path.join(project.simulationFilePath, hostType + '.js');
    }
    return this._hostJsFiles[hostType];
};

/**
 * @privte
 */
SimulationFiles.prototype._waitOnAppHostJs = function () {
    if (this._builtOnce[appHost]) {
        var project = this._simulator.project;
        // If we've ever built app-host, just use what we have (on a refresh of sim-host, we don't want to rebuild app-host).
        return Q.when(loadJsonFile(path.join(project.simulationFilePath, 'app-host.json')).plugins);
    } else {
        // Otherwise force it to build now (this is to handle the case where sim-host is requested before app-host).
        return this.createAppHostJsFile();
    }
};

/**
 * @param {string} hostType
 * @param {object} scriptTypes
 * @param {Array} pluginList
 * @return {Promise}
 * @private
 */
SimulationFiles.prototype._createHostJsFile = function (hostType, scriptTypes, pluginList) {
    var outputFile = this.getHostJsFile(hostType);
    var project = this._simulator.project;
    var simulationFilePath = project.simulationFilePath;
    var jsonFile = path.join(simulationFilePath, hostType + '.json');

    pluginList = pluginList || project.getPlugins();

    // See if we already have created our output file, and it is up-to-date with all its dependencies. However, if the
    // list of plugins has changed, or the directory where a plugin's simulation definition lives has changed, we need
    // to force a refresh.
    if (fs.existsSync(outputFile) && validatePlugins(hostType, pluginList, simulationFilePath)) {
        log.log('Creating ' + hostType + '.js: Existing file found and is up-to-date.');
        this._builtOnce[hostType] = true;
        return Q.when(pluginList);
    }

    var filePath = path.join(this._simulator.hostRoot[hostType], hostType + '.js');
    log.log('Creating ' + hostType + '.js');

    var scriptDefs = createScriptDefs(hostType, scriptTypes);

    var b = browserify({ paths: getBrowserifySearchPaths(hostType), debug: true });
    b.transform(function (file) {
        if (file === filePath) {
            var data = '';
            return through(function (buf, encoding, cb) {
                data += buf;
                cb();
            }, function (cb) {
                data = scriptDefs.reduce(function (previousData, scriptDef) {
                    return previousData.replace(scriptDef.comment, scriptDef.code.join(',\n'));
                }, data);
                this.push(data);
                cb();
            });
        } else {
            // No-op for other files
            return through(function (chunk, encoding, cb) {
                cb(null, chunk);
            });
        }
    });

    b.add(filePath);

    // Include common modules
    getCommonModules(hostType).forEach(function (module) {
        b.require(module.file, { expose: module.name });
    });

    var pluginTemplate = '\'%PLUGINID%\': require(\'%EXPOSEID%\')';
    Object.keys(pluginList).forEach(function (pluginId) {
        var pluginPath = pluginList[pluginId];
        scriptDefs.forEach(function (scriptDef) {
            var pluginScriptFile = path.join(pluginPath, scriptDef.fileName);
            if (fs.existsSync(pluginScriptFile)) {
                var exposeId = scriptDef.exposeId.replace(/%PLUGINID%/g, pluginId);
                scriptDef.code.push(pluginTemplate
                    .replace(/%PLUGINID%/g, pluginId)
                    .replace(/%EXPOSEID%/g, exposeId));
                b.require(pluginScriptFile, { expose: exposeId });
            }
        });
    });

    var fileInfo = {};
    b.on('file', function (file) {
        fileInfo[file] = new Date(fs.statSync(file).mtime).getTime();
    });

    var outputFileStream = fs.createWriteStream(outputFile);
    var d = Q.defer();

    outputFileStream.on('finish', function () {
        this._builtOnce[hostType] = true;
        fs.writeFileSync(jsonFile, JSON.stringify({ plugins: pluginList, files: fileInfo }));
        d.resolve(pluginList);
    }.bind(this));
    outputFileStream.on('error', function (error) {
        d.reject(error);
    });

    var bundle = b.bundle();
    bundle.on('error', function (error) {
        d.reject(error);
    });

    bundle.pipe(outputFileStream);

    return d.promise;
};

function validatePlugins(hostType, pluginList, simulationFilePath) {
    var jsonFile = path.join(simulationFilePath, hostType + '.json');
    if (!fs.existsSync(jsonFile)) {
        return false;
    }

    var cache = loadJsonFile(jsonFile);
    if (!jsUtils.compareObjects(cache.plugins, pluginList)) {
        return false;
    }

    var cachedFileInfo = cache.files;
    return Object.keys(cachedFileInfo).every(function (file) {
        return fs.existsSync(file) && cachedFileInfo[file] === new Date(fs.statSync(file).mtime).getTime();
    });
}

function getBrowserifySearchPaths(hostType) {
    if (!_browserifySearchPaths) {
        _browserifySearchPaths = {};
        _browserifySearchPaths[appHost] = [dirs.modules['common'], dirs.thirdParty];
        _browserifySearchPaths[simHost] = [dirs.modules[simHost], dirs.modules['common'], dirs.thirdParty];
        _browserifySearchPaths['telemetry-helper'] = [dirs.modules['common']];
    }

    return hostType ? _browserifySearchPaths[hostType] : _browserifySearchPaths;
}

function createScriptDefs(hostType, scriptTypes) {
    return scriptTypes.map(function (scriptType) {
        return {
            comment: {
                'js': '/** PLUGINS **/',
                'handlers': '/** PLUGIN-HANDLERS **/',
                'clobbers': '/** PLUGIN-CLOBBERS **/'
            }[scriptType],
            exposeId: {
                'js': '%PLUGINID%',
                'handlers': '%PLUGINID%-handlers',
                'clobbers': '%PLUGINID%-clobbers'
            }[scriptType],
            fileName: pluginSimulationFiles[hostType][scriptType],
            code: []
        };
    });
}

function getCommonModules(hostType) {
    if (!_commonModules) {
        _commonModules = {};
        var browserifySearchPaths = getBrowserifySearchPaths();
        Object.keys(browserifySearchPaths).forEach(function (hostType) {
            _commonModules[hostType] = [];
            browserifySearchPaths[hostType].forEach(function (searchPath) {
                if (fs.existsSync(searchPath)) {
                    fs.readdirSync(searchPath).forEach(function (file) {
                        if (path.extname(file) === '.js') {
                            _commonModules[hostType].push({ name: path.basename(file, '.js'), file: path.join(searchPath, file) });
                        }
                    });
                }
            });
        });
    }
    return hostType ? _commonModules[hostType] : _commonModules;
}

module.exports = SimulationFiles;
