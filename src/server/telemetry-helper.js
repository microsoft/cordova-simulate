var config = require('./config');
var plugins = require('./plugins');

function handleClientTelemetry(telemetryData) {
    var event = telemetryData.event;
    var props = telemetryData.props || {};
    var piiProps = telemetryData.piiProps || {};
    var shouldAnonymizeExec = event === 'exec' && plugins.getPluginsTelemetry().simulatedBuiltIn.indexOf(props.plugin) === -1;

    if (shouldAnonymizeExec) {
        // For the exec event, the telemetry properties are considered anonymous data for plugins that aren't built-in, so put everything but the "handled" property in piiProps
        props = {};
        Object.keys(telemetryData.props).forEach(function (key) {
            if (key === 'handled') {
                props[key] = telemetryData.props[key];
            } else {
                piiProps[key] = telemetryData.props[key];
            }
        });
    }

    sendTelemetry(event, props, piiProps);
}

function sendTelemetry(event, props, piiProps) {
    if (config.telemetry && config.telemetry.sendTelemetry && typeof config.telemetry.sendTelemetry === 'function') {
        config.telemetry.sendTelemetry(event, props || {}, piiProps || {});
    }
}

module.exports = {
    handleClientTelemetry: handleClientTelemetry,
    sendTelemetry: sendTelemetry
};
