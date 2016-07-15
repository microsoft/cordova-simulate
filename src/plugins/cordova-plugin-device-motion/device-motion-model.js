// Copyright (c) Microsoft Corporation. All rights reserved.

// report interval in milliseconds
var ACCELEROMETER_REPORT_INTERVAL = 50;

var _onChangeCallback,
    _axis = {
        x: 0,
        y: 0,
        z: 0
    };

function updateAxis(values) {
    values = values || {};

    var updatedValues = {};

    if (values.x) {
        _axis.x = parseFloat(values.x);
        updatedValues.x = _axis.x;
    }

    if (values.y) {
        _axis.y = parseFloat(values.y);
        updatedValues.y = _axis.y;
    }

    if (values.z) {
        _axis.z = parseFloat(values.z);
        updatedValues.z = _axis.z;
    }

    // notify if any value has been updated
    if (Object.keys(updatedValues).length > 0 && _onChangeCallback) {
        _onChangeCallback(updatedValues);
    }
}

function addAxisChangeCallback(callback) {
    _onChangeCallback = (typeof callback === 'function') ? callback : null;
}

module.exports = {
    updateAxis: updateAxis,
    addAxisChangeCallback: addAxisChangeCallback,
    get x() {
        return _axis.x;
    },
    get y() {
        return _axis.y;
    },
    get z() {
        return _axis.z;
    },
    ACCELEROMETER_REPORT_INTERVAL: ACCELEROMETER_REPORT_INTERVAL
};
