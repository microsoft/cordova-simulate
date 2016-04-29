// Copyright (c) Microsoft Corporation. All rights reserved.

var cordovaServe = require('cordova-serve'),
    path = require('path'),
    simulateServer = require('./server');

var launchServer = function(opts) {
    var simHostRoot = opts.simhost || path.join(__dirname, 'sim-host');
    
    return simulateServer(opts, {
        simHostRoot: simHostRoot
    })
};

var closeServer = function() {
    return simulateServer.server && simulateServer.server.close();
};

var launchBrowser = function(target, url) {
    return cordovaServe.launchBrowser({ target: target, url: url });
};

var simulate = function(opts) {
    
    var target = opts.target || 'chrome';
    var simHostUrl;

    return launchServer(opts)
        .then(function(urls) {
            simHostUrl = urls.simHostUrl;
            return launchBrowser(target, urls.appUrl);
        }).then(function() {
            return launchBrowser(target, simHostUrl);
        }).catch(function(error) {
            // Ensure server is closed, then rethrow so it can be handled by downstream consumers.
            closeServer();
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(error);
            }
        });
};

module.exports = simulate;
module.exports.launchBrowser = launchBrowser;
module.exports.launchServer = launchServer;
module.exports.closeServer = closeServer;