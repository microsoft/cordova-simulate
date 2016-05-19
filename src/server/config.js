// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path');

var config = {};
var simulationFilePath;

// module properties
[
    'liveReload',
    'platform',
    'platformRoot',
    'forcePrepare',
    'projectRoot',
    'server',
    'telemetry',
    'simHostOptions',
    'xhrProxy',
    'touchEvents'
].forEach(function (prop) {
    Object.defineProperty(module.exports, prop, {
        get: function () {
            return getValue(prop);
        },
        set: function (value) {
            setValue(prop, value);
        }
    });
});

Object.defineProperties(module.exports, {
    simulationFilePath: {
        get: function () {
            if (!simulationFilePath) {
                var projectRoot = getValue('projectRoot');
                simulationFilePath = path.join(projectRoot, 'simulation');
                if (!fs.existsSync(simulationFilePath)) {
                    fs.mkdirSync(simulationFilePath);
                }
            }
            return simulationFilePath;
        }
    }
});

function setValue(prop, value, single) {
    if (single && config.hasOwnProperty(prop)) {
        throw new Error('Can\'t reinitialize ' + prop);
    }
    config[prop] = value;
}

function getValue(prop, optional) {
    if (!config.hasOwnProperty(prop) && !optional) {
        throw new Error('Cannot get ' + prop + ' as it has not been initialized.');
    }
    return config[prop];
}
