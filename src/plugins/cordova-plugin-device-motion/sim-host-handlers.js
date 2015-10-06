// Copyright (c) Microsoft Corporation. All rights reserved.

var deviceMotion = require('cordova-plugin-device-motion');
var accelerometerHandle = null;

module.exports = {
    'Accelerometer': {
        start: function (win, lose) {
            accelerometerHandle = setInterval(function() {
                win(getCurrentAcceleration());
            }, deviceMotion.ACCELEROMETER_REPORT_INTERVAL);
        },
        stop: function (win, lose) {
            if (accelerometerHandle === null) {
                return;
            }

            clearInterval(accelerometerHandle);
            accelerometerHandle = null;
        },
        getCurrentAcceleration: function (win, lose) {
            win(getCurrentAcceleration());
        }
    }
};

function getCurrentAcceleration () {
    return {
        x: parseFloat(deviceMotion.x),
        y: parseFloat(deviceMotion.y),
        z: parseFloat(deviceMotion.z),
        timestamp: (new Date()).getTime()
    };
}
