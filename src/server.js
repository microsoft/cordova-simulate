// Copyright (c) Microsoft Corporation. All rights reserved.

var Q = require('q'),
    fs = require('fs'),
    cordovaServe = require('cordova-serve'),
    path = require('path'),
    config = require('./server/config'),
    log = require('./server/log'),
    simServer = require('./server/server'),
    simSocket = require('./server/socket'),
    plugins = require('./server/plugins');

var server = cordovaServe();

module.exports = function (opts, simHostOpts) {
    var appUrl,
        simHostUrl;

    opts = opts || {};

    var platform = opts.platform || 'browser';
    var target = opts.target || 'chrome';

    config.platform = platform;
    config.simHostOptions = simHostOpts || {};

    simServer.attach(server.app);

    return server.servePlatform(platform, {
        port: opts.port,
        root: opts.dir,
        noServerInfo: true
    }).then(function () {
        simSocket.init(server.server);
        config.server = server.server;
        var projectRoot = server.projectRoot;
        config.projectRoot = projectRoot;
        config.platformRoot = server.root;
        var urlRoot = 'http://localhost:' + server.port + '/';
        appUrl = urlRoot + parseStartPage(projectRoot);
        simHostUrl = urlRoot + 'simulator/index.html';
        log.log('Server started:\n- App running at: ' + appUrl + '\n- Sim host running at: ' + simHostUrl);
        return {appUrl: appUrl, simHostUrl: simHostUrl};
    }).catch(function (error) {
        // Ensure server is closed, then rethrow so it can be handled by downstream consumers.
        config.server && config.server.close();
        throw error;
    });
};

function parseStartPage(projectRoot) {
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
}

module.exports.dirs = require('./server/dirs');
module.exports.app = server.app;
module.exports.log = log;

Object.defineProperty(module.exports, 'server', {
    get: function () {
        return config.server;
    }
});
