// Copyright (c) Microsoft Corporation. All rights reserved.

/**
 * @constructor
 */
function Configuration() {
    this._config = {};
}

[
    { name: 'debugHostHandlers', optional: true },
    { name: 'forcePrepare' },
    { name: 'liveReload' },
    { name: 'simHostOptions' },
    { name: 'telemetry', optional: true },
    { name: 'touchEvents', optional: true },
    { name: 'xhrProxy', optional: true }
].forEach(function (prop) {
    Object.defineProperty(Configuration.prototype, prop.name, {
        get: function () {
            return getValue(this, prop.name, prop.optional);
        },
        set: function (value) {
            setValue(this, prop.name, value, prop.single);
        }
    });
});

function setValue(instance, prop, value, single) {
    if (single && instance._config.hasOwnProperty(prop)) {
        throw new Error('Can\'t reinitialize ' + prop);
    }
    instance._config[prop] = value;
}

function getValue(instance, prop, optional) {
    if (!instance._config.hasOwnProperty(prop) && !optional) {
        throw new Error('Cannot get ' + prop + ' as it has not been initialized.');
    }
    return instance._config[prop];
}

module.exports = Configuration;
