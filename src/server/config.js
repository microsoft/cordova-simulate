// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path');

var config = {};

// module properties
[
    { name: 'debugHostHandlers', optional: true },
    { name: 'forcePrepare' },
    { name: 'liveReload' },
    { name: 'platform' },
    { name: 'platformRoot' },
    { name: 'projectRoot', single: true },
    { name: 'server', optional: true },
    { name: 'simHostOptions' },
    { name: 'simulationFilePath' },
    { name: 'telemetry', optional: true },
    { name: 'touchEvents', optional: true },
    { name: 'xhrProxy', optional: true }
].forEach(function (prop) {
    Object.defineProperty(module.exports, prop.name, {
        get: function () {
            return getValue(prop.name, prop.optional);
        },
        set: function (value) {
            setValue(prop.name, value, prop.single);
        }
    });
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

function newInstance() {
    config = {};
}

module.exports.newInstance = newInstance;
