// Copyright (c) Microsoft Corporation. All rights reserved.

var telemetry = require('telemetry-helper');

var baseProps = {
    plugin: 'cordova-plugin-battery-status',
    panel: 'battery-status'
};

module.exports = function (message) {
    var battery = require('./battery');

    battery.initialize();

    function initialize() {
        var labelBatteryLevel = document.getElementById('battery-level-label'),
            levelRange = document.getElementById('battery-level'),
            pluggedCheckbox = document.getElementById('is-plugged');

        function updateBatteryLevelText(level) {
            labelBatteryLevel.value = level + '%';
        }

        // Initialize the UI with the values of isPlugged and battery level.
        var info = battery.getBatteryInfo();
        pluggedCheckbox.checked = info.isPlugged;
        levelRange.value = info.level;
        updateBatteryLevelText(info.level);

        // attach event listeners
        levelRange.addEventListener('change', function () {
            battery.updateBatteryLevel(this.value);
        });

        levelRange.addEventListener('input', function () {
            updateBatteryLevelText(this.value);
        });

        pluggedCheckbox.addEventListener('click', function () {
            battery.updatePluggedStatus(this.checked);
        });

        registerTelemetryEvents();
    }

    function registerTelemetryEvents() {
        document.getElementById('battery-level').onchange = telemetry.sendUITelemetry.bind(this, Object.assign({}, baseProps, { control: 'battery-level' }));

        // Clicking the checkbox's label fires the click event twice, so keep track of the previous state. Note that we can't use the change event because the component seems to swallow it.
        var previousPluggedState = true;
        var pluggedCheckbox = document.getElementById('is-plugged');

        pluggedCheckbox.onclick = function () {
            if (pluggedCheckbox.checked !== previousPluggedState) {
                previousPluggedState = pluggedCheckbox.checked;
                telemetry.sendUITelemetry(Object.assign({}, baseProps, { control: 'is-plugged' }));
            }
        };
    }

    return {
        initialize: initialize
    };
};
