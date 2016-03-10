// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {
    var battery = require('./battery');

    return {
        Battery: {
            start: function (success, error) {
                battery.onBatteryStart(success, error);
            },
            stop: function () {
                battery.onBatteryStop();
            }
        }
    };
};
