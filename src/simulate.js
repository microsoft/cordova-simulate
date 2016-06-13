// Copyright (c) Microsoft Corporation. All rights reserved.

var Simulator = require('./server/simulator');

var launchBrowser = function (target, url) {
    return require('cordova-serve').launchBrowser({ target: target, url: url });
};

var simulate = function (opts) {
    var target = opts.target || 'chrome';
    var simulator = new Simulator(opts);

    return simulator.startSimulation(opts)
        .then(function () {
            return launchBrowser(target, simulator.appUrl);
        }).then(function () {
            return launchBrowser(target, simulator.simHostUrl);
        }).then(function () {
            return simulator;
        }).catch(function (error) {
            // Ensure server is closed, then rethrow so it can be handled by downstream consumers.
            simulator.stopSimulation();
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(error);
            }
        });
};

module.exports = simulate;
module.exports.launchBrowser = launchBrowser;
module.exports.dirs = require('./server/dirs');
module.exports.log = require('./server/utils/log');
module.exports.Simulator = Simulator;
