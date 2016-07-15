// Copyright (c) Microsoft Corporation. All rights reserved.

var deviceMotionModel = require('./device-motion-model');

var accelerometerHandle = null;

function getCurrentAcceleration () {
    return {
        x: deviceMotionModel.x,
        y: deviceMotionModel.y,
        z: deviceMotionModel.z,
        timestamp: (new Date()).getTime()
    };
}

module.exports = {
    'Accelerometer': {
        start: function (win, lose) {
            accelerometerHandle = setInterval(function() {
                win(getCurrentAcceleration());
            }, deviceMotionModel.ACCELEROMETER_REPORT_INTERVAL);
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
