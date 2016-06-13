var config = require('./config');
var plugins = require('./plugins');

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
 * Handles telemetry sent by clients. Anonymizes properties if necessary, and sends the event to the external telemetr module if one was provided.
 * 
 * @param {any} telemetryData Data about the telemetry event.
 */
function handleClientTelemetry(telemetryData) {
    var event = telemetryData.event;
    var props = telemetryData.props || {};
    var piiProps = telemetryData.piiProps || {};

    if (shouldAnonymizeEvent(event, props)) {
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

    sendTelemetry(event, props, piiProps);
}

/**
 * Determines whether a telemetry event should be anonymized.
 * 
 * @param {string} event The name of the telemetry event.
 * @param {any} props A dictionary of properties associated with the telemetry event.
 */
function shouldAnonymizeEvent(event, props) {
    // We anonymize an event if it is a plugin event, and the plugin is not a built-in one.
    return !!PLUGIN_EVENTS_TO_ANONYMIZE.indexOf(event) > -1 && plugins.getPluginsTelemetry().simulatedBuiltIn.indexOf(props.plugin) === -1;
}

/**
 * Sends a telemetry event to an external telemetry module if there was one provided.
 * 
 * @param {string} event The name of the telemetry event.
 * @param {any} props A dictionary of public properties.
 * @param {any} piiProps A dictionary of Personally Identifiable Information (PII) properties. These properties should be properly anonymized by the external telemetry consumer.
 */
function sendTelemetry(event, props, piiProps) {
    if (config.telemetry && config.telemetry.sendTelemetry && typeof config.telemetry.sendTelemetry === 'function') {
        config.telemetry.sendTelemetry(event, props || {}, piiProps || {});
    }
}

module.exports = {
    handleClientTelemetry: handleClientTelemetry,
    sendTelemetry: sendTelemetry
};
