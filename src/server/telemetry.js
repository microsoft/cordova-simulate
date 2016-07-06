// Copyright (c) Microsoft Corporation. All rights reserved.

// Some telemetry events concerning plugins need to be further anonymized based on whether the plugin is built-in or not.
var PLUGIN_EVENTS_TO_ANONYMIZE = [
    'exec',
    'exec-unhandled'
];
var PLUGIN_PROPS_TO_ANONYMIZE = [
    'plugin',
    'service',
    'action'
];

/**
 * @param {object=} opts
 * @constructor
 */
function Telemetry(simulator, opts) {
    this._simulator = simulator;
    this._sendTelemetry = null;

    if (opts && typeof opts.sendTelemetry === 'function') {
        this._sendTelemetry = opts.sendTelemetry;
    }
}

/**
 * Handles telemetry sent by clients. Anonymizes properties if necessary, and sends the event
 * to the external telemetry module if one was provided.
 *
 * @param {any} telemetryData Data about the telemetry event.
 */
Telemetry.prototype.handleClientTelemetry = function (telemetryData) {
    var event = telemetryData.event;
    var props = telemetryData.props || {};
    var piiProps = telemetryData.piiProps || {};

    if (this._shouldAnonymizeEvent(event, props)) {
        props = {};
        Object.keys(telemetryData.props).forEach(function (key) {
            // If the key is 'plugin' and the value is '_unknown', we don't anonymize this property.
            var shouldAnonymizeKey = PLUGIN_PROPS_TO_ANONYMIZE.indexOf(key) > -1 && !(key === 'plugin' && telemetryData.props[key] === '_unknown');

            if (shouldAnonymizeKey) {
                piiProps[key] = telemetryData.props[key];
            } else {
                props[key] = telemetryData.props[key];
            }
        });
    }

    this.sendTelemetry(event, props, piiProps);
};

/**
 * Sends a telemetry event to an external telemetry module if there was one provided.
 *
 * @param {string} event The name of the telemetry event.
 * @param {any} props A dictionary of public properties.
 * @param {any} piiProps A dictionary of Personally Identifiable Information (PII) properties. These properties should be properly anonymized by the external telemetry consumer.
 */
Telemetry.prototype.sendTelemetry = function (event, props, piiProps) {
    if (this._sendTelemetry) {
        this._sendTelemetry(event, props || {}, piiProps || {});
    }
};

/**
 * Determines whether a telemetry event should be anonymized. An event is anonymized when
 * it is a plugin event, and the plugin is not a built-in one.
 *
 * @param {string} event The name of the telemetry event.
 * @param {any} props A dictionary of properties associated with the telemetry event.
 * @return {boolean}
 */
Telemetry.prototype._shouldAnonymizeEvent = function (event, props) {
    var project = this._simulator.project;

    return PLUGIN_EVENTS_TO_ANONYMIZE.indexOf(event) > -1 && !project.hasBuiltInPluginTelemetry(props.plugin);
};

module.exports = Telemetry;
