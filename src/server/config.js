// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path');

var config = {};
var simulationFilePath;

Object.defineProperties(module.exports, {
    liveReload: {
        get: function () {
            return getValue('liveReload');
        },
        set: function (value) {
            setValue('liveReload', value);
        }
    },
    platform: {
        get: function () {
            return getValue('platform');
        },
        set: function (value) {
            setValue('platform', value);
        }
    },
    platformRoot: {
        get: function () {
            return getValue('platformRoot');
        },
        set: function (value) {
            setValue('platformRoot', value);
        }
    },
    forcePrepare: {
        get: function () {
            return getValue('forcePrepare');
        },
        set: function (value) {
            setValue('forcePrepare', value);
        }
    },
    projectRoot: {
        get: function () {
            return getValue('projectRoot');
        },
        set: function (value) {
            setValue('projectRoot', value, true);
        }
    },
    server: {
        get: function () {
            return getValue('server', true);
        },
        set: function (value) {
            setValue('server', value);
        }
    },
    telemetry: {
        get: function () {
            return getValue('telemetry', true);
        },
        set: function (value) {
            setValue('telemetry', value);
        }
    },
    simHostOptions: {
        get: function () {
            return getValue('simHostOptions');
        },
        set: function (value) {
            setValue('simHostOptions', value);
        }
    },
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
    },
    xhrProxy: {
        get: function() {
            return getValue('xhrProxy', true);
        },
        set: function(value) {
            setValue('xhrProxy', value);
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
