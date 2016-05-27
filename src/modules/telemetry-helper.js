// Copyright (c) Microsoft Corporation. All rights reserved.

var clientSocket;
var serviceToPluginMap;
var pendingTelemetryEvents = [];

function init(socket) {
    clientSocket = socket;
    trySendPendingEvents();
}

function registerPluginServices(pluginServices) {
    serviceToPluginMap = pluginServices;
    trySendPendingEvents();
}

function trySendPendingEvents() {
    if (!clientSocket) {
        return;
    }

    var unsent = [];

    pendingTelemetryEvents.forEach(function (eventData) {
        if (mustMapServiceToPlugin(eventData) && !serviceToPluginMap) {
            unsent.push(eventData);
        } else {
            sendClientTelemetry(eventData);
        }
    });
    
    pendingTelemetryEvents = unsent;
}

function mustMapServiceToPlugin(eventData) {
    return !!eventData.props.service && !eventData.plugin;
}

function sendClientTelemetry(event, props, piiProps) {
    var eventData = {
        event: event,
        props: props,
        piiProps: piiProps
    };

    if (!clientSocket) {
        pendingTelemetryEvents.push(eventData);
        return;
    }

    if (mustMapServiceToPlugin(eventData)) {
        if (!serviceToPluginMap) {
            pendingTelemetryEvents.push(eventData);
            return;
        }

        eventData.props.plugin = serviceToPluginMap[eventData.props.service] || '_unknown';
    }

    clientSocket.emit('telemetry', eventData);
}

function sendUITelemetry(uiControlData) {
    sendClientTelemetry('plugin-ui-interaction', uiControlData);
}

module.exports.init = init;
module.exports.registerPluginServices = registerPluginServices;
module.exports.sendClientTelemetry = sendClientTelemetry;
module.exports.sendUITelemetry = sendUITelemetry;
