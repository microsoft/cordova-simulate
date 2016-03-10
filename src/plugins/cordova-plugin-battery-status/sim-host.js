// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (message) {
    var battery = require('./battery');

    battery.initialize();

    function initialize() {
        var labelBatteryLevel = document.getElementById('battery-level-label'),
            levelRange        = document.getElementById('battery-level'),
            pluggedCheckbox   = document.getElementById('is-plugged');

        function updateBatteryLevelText(level) {
            labelBatteryLevel.textContent = level + '%';
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
    }

    return {
        initialize: initialize
    };
};
