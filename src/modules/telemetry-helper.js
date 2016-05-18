// Copyright (c) Microsoft Corporation. All rights reserved.

var clientSocket;

function init(socket) {
    clientSocket = socket;
}

function sendClientTelemetry(event, props, piiProps) {
    if (!clientSocket) {
        return;
    }

    var telemetryData = {
        event: event,
        props: props,
        piiProps: piiProps
    };

    clientSocket.emit('telemetry', telemetryData);
}

function sendUITelemetry(uiControlData) {
    sendClientTelemetry('plugin-ui-interaction', uiControlData);
}

module.exports.init = init;
module.exports.sendClientTelemetry = sendClientTelemetry;
module.exports.sendUITelemetry = sendUITelemetry;
