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
function SimulationFiles(hostRoot) {
    this._hostJsFiles = {};
    this._builtOnce = {};
    this._appHostJsPromise = null;

    this._hostTypeJsFile = {};
    this._hostTypeJsFile[appHost] = path.join(hostRoot[appHost], appHost + '.js');
    this._hostTypeJsFile[simHost] = path.join(hostRoot[simHost], simHost + '.js');
}

function loadJsonFile(file) {
    return JSON.parse(fs.readFileSync(file).toString());
}

/**
 * @param {Project} project
 * @return {Promise}
 */
SimulationFiles.prototype.createSimHostJsFile = function (project) {
    // Don't create sim-host.js until we've created app-host.js at least once, so we know we're working with the same
    // list of plugins.
    return this._waitOnAppHostJs(project).then(function (appHostPlugins) {
        try {
            return this._createHostJsFile(project, simHost, ['js', 'handlers'], appHostPlugins);
        } catch (e) {
            console.log('ERROR CREATING SIM-HOST.JS:\n' + e.stack);
        }
    }.bind(this));
};

/**
 * @param {Project} project
 * @return {Promise}
 */
SimulationFiles.prototype.createAppHostJsFile = function (project) {
    this._appHostJsPromise = this._appHostJsPromise || project.prepare().then(function () {
        return this._createHostJsFile(project, appHost, ['js', 'handlers', 'clobbers']);
    }.bind(this)).then(function (pluginList) {
        this._appHostJsPromise = null;
        return pluginList;
    }.bind(this));

    return this._appHostJsPromise;
};

/**
 * Check if plugins have changed. When sim-host is not created yet, assume
 * that plugins haven't changed.
 * @param {Array} pluginList
 * @param {string} simulationFilePath
 * @return {boolean}
 */
SimulationFiles.prototype.pluginsChanged = function (pluginList, simulationFilePath) {
    return (this._builtOnce[simHost] && !validatePlugins(simHost, pluginList, simulationFilePath));
};

/**
 * @param {string} hostType
 * @param {string} simulationFilePath
 * @return {string}
 */
SimulationFiles.prototype.getHostJsFile = function (hostType, simulationFilePath) {
    if (!this._hostJsFiles[hostType]) {
        this._hostJsFiles[hostType] = path.join(simulationFilePath, hostType + '.js');
    }
    return this._hostJsFiles[hostType];
};

/**
 * @param {Project} project
 * @private
 */
SimulationFiles.prototype._waitOnAppHostJs = function (project) {
    if (this._builtOnce[appHost]) {
        // If we've ever built app-host, just use what we have (on a refresh of sim-host, we don't want to rebuild app-host).
        return Q.when(loadJsonFile(path.join(project.simulationFilePath, 'app-host.json')).plugins);
    } else {
        // Otherwise force it to build now (this is to handle the case where sim-host is requested before app-host).
        return this.createAppHostJsFile(project);
    }
};

/**
 * @param {Project} project
 * @param {string} hostType
 * @param {object} scriptTypes
 * @param {Array=} pluginList
 * @return {Promise}
 * @private
 */
SimulationFiles.prototype._createHostJsFile = function (project, hostType, scriptTypes, pluginList) {
    var simulationFilePath = project.simulationFilePath;
    var outputFile = this.getHostJsFile(hostType, simulationFilePath);
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

    var filePath = this._hostTypeJsFile[hostType];
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
