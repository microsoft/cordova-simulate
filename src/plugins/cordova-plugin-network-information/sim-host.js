// Copyright (c) Microsoft Corporation. All rights reserved.

var network = require('./network');

var telemetry = require('telemetry-helper');

var baseProps = {
    plugin: 'cordova-plugin-network-information',
    panel: 'network-information'
};

network.initialize();

function initialize() {
    var connectionTypeList = document.getElementById('connection-list');
    connectionTypeList.value = network.connectionType;
    connectionTypeList.addEventListener('change', function () {
        network.updateNetworkType(connectionTypeList.value);
    });
    registerTelemetryEvents();
}

function registerTelemetryEvents() {
    var connectionList = document.getElementById('connection-list');

    connectionList.onchange = function () {
        var option = connectionList.options[connectionList.selectedIndex];

        telemetry.sendUITelemetry(Object.assign({}, baseProps, { control: 'connection-list', value: option.value }));
    };
}

module.exports = {
    initialize: initialize
};
