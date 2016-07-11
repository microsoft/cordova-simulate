// Copyright (c) Microsoft Corporation. All rights reserved.

/**
 * The Configuration model manages the configuration properties for the simulation.
 * These properties are mapped with the options provided for the simulation, and
 * are cross to any other instance involved in the simulation.
 * @constructor
 */
function Configuration() {}

Configuration.prototype = Object.create(null);
Configuration.prototype.constructor = Configuration;

[
    { name: 'debugHostHandlers', optional: true },
    { name: 'forcePrepare' },
    { name: 'liveReload' },
    { name: 'simHostOptions' },
    { name: 'simulationFilePath' },
    { name: 'telemetry', optional: true },
    { name: 'touchEvents', optional: true },
    { name: 'xhrProxy', optional: true }
].forEach(function (prop) {
    Object.defineProperty(Configuration.prototype, prop.name, {
        get: function () {
            return getValue.apply(this, [prop.name, prop.optional]);
        },
        set: function (value) {
            setValue.apply(this, [prop.name, value, prop.single]);
        }
    });
});

function setValue(prop, value, single) {
    var internalProp = '_' + prop;
    if (single && Object.prototype.hasOwnProperty.call(this, internalProp)) {
        throw new Error('Can\'t reinitialize ' + prop);
    }
    this[internalProp] = value;
}

function getValue(prop, optional) {
    var internalProp = '_' + prop;
    if (!Object.prototype.hasOwnProperty.call(this, internalProp) && !optional) {
        throw new Error('Cannot get ' + prop + ' as it has not been initialized.');
    }
    return this[internalProp];
}

module.exports = Configuration;
