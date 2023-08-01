// Copyright (c) Microsoft Corporation. All rights reserved.

/*eslint-env node */

var Simulator = require('./server/simulator');
var BrowserHelper = require('./browsers/browser');

var launchBrowser = function (target, url) {
    return BrowserHelper.launchBrowser({ target: target, url: url });
};

var simulate = function (opts) {
    if(opts.generateids) {
        require('./devices/make-uuids');
    }
    var target = opts.target || 'default';
    var simulator = new Simulator(opts);

    return simulator.startSimulation()
        .then(function () {
            return launchBrowser(target, simulator.appUrl());
        })
        .then(function () {
            return launchBrowser(target, simulator.simHostUrl());
        })
        .then(function () {
            return simulator;
        })
        .catch(function (error) {
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
module.exports.Simulator = Simulator;
module.exports.launchBrowser = launchBrowser;
module.exports.dirs = require('./server/dirs');
module.exports.log = require('./server/utils/log');
