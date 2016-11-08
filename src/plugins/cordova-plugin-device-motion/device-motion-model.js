// Copyright (c) Microsoft Corporation. All rights reserved.

Math.sign = Math.sign || function (x) {
    x = +x; // convert to a number
    if (x === 0 || isNaN(x)) {
        return Number(x);
    }
    return x > 0 ? 1 : -1;
};

// report interval in milliseconds
var ACCELEROMETER_REPORT_INTERVAL = 50;
var G_CONSTANT = 9.81;
var degToRad = Math.PI / 180;

var _onChangeCallback;
var axisValues = ['x', 'y', 'z'];
var rotationValues = ['alpha', 'beta', 'gamma'];
var allValues = axisValues.concat(rotationValues);

var _axis = {
    x: 0,
    y: 0,
    z: 0
};
normalizeFromAcceleration(_axis);

function updateAxis(values) {
    var newValues = applyValues(values, axisValues);
    normalizeFromAcceleration(newValues);
    update(newValues);
}

function updateRotation(values) {
    var newValues = applyValues(values, rotationValues);
    normalizeFromRotation(newValues);
    update(newValues);
}

function addAxisChangeCallback(callback) {
    _onChangeCallback = (typeof callback === 'function') ? callback : null;
}

function applyValues(values, names) {
    var newValues = JSON.parse(JSON.stringify(_axis));
    names.forEach(function (name) {
        if (values.hasOwnProperty(name)) {
            newValues[name] = values[name];
        }
    });
    return newValues;
}

function update(values) {
    values = values || {};

    var updatedValues = {};
    var dirty = false;

    allValues.forEach(function (name) {
        if (values[name] !== _axis[name]) {
            dirty = true;
            _axis[name] = values[name];
            updatedValues[name] = values[name];
        }
    });

    // notify if any value has been updated
    if (dirty && _onChangeCallback) {
        _onChangeCallback(updatedValues);
    }
}

function normalizeFromRotation(values) {
    values.alpha = constrainAlpha(values.alpha);
    values.beta = constrainBeta(values.beta);
    values.gamma = constrainGamma(values.gamma);

    var accel = accelFromRot(values.beta, values.gamma);
    values.x = accel.x;
    values.y = accel.y;
    values.z = accel.z;
}

function normalizeFromAcceleration(values) {
    values.x = constrainAcceleration(values.x);
    values.y = constrainAcceleration(values.y);
    values.z = constrainAcceleration(values.z);

    var sinY = -values.y / G_CONSTANT;
    values.beta = constrainBeta(asinDegrees(sinY));
    values.gamma = constrainGamma(asinDegrees(values.x / cosDegrees(values.beta) / G_CONSTANT));

    // There are two possible values of beta and gamma that will fit - calculate x, y and z from current results to
    // see if we need to switch.
    var accel = accelFromRot(values.beta, values.gamma);
    if (accel.x !== values.x || accel.y !== values.y || accel.z !== values.z) {
        values.beta = Math.sign(values.beta) * 180 - values.beta;
        values.gamma = -values.gamma;
    }

    values.alpha = constrainAlpha(values.alpha);
}

function accelFromRot(beta, gamma) {
    var cosX = cosDegrees(gamma);
    var sinX = sinDegrees(gamma);
    var cosY = cosDegrees(beta);
    var sinY = sinDegrees(beta);

    return {
        x: (cosY * sinX * G_CONSTANT).toFixed(2),
        y: (-sinY * G_CONSTANT).toFixed(2),
        z: (-cosY * cosX * G_CONSTANT).toFixed(2)
    };
}

function cosDegrees(value) {
    return Math.cos(value * degToRad);
}

function sinDegrees(value) {
    return Math.sin(value * degToRad);
}

function asinDegrees(value) {
    return Math.asin(Math.min(Math.max(value, -1), 1)) / degToRad;
}

function constrainAlpha(alpha) {
    // Rounding because hit scenarios where mod was returning a non-integer value
    return Math.round(makeInt(alpha) % 360);
}

function constrainBeta(beta) {
    // enforce beta in [-180,180] as per w3c spec
    beta = makeInt(beta);
    if (beta < -180) {
        beta += 360;
    }
    else if (beta >= 180) {
        beta -= 360;
    }
    return beta;
}

function constrainGamma(gamma) {
    // enforce gamma in [-90,90] as per w3c spec
    gamma = makeInt(gamma);
    if (gamma < -90) {
        gamma = -90;
    }
    if (gamma > 90) {
        gamma = 90;
    }
    return gamma;
}

function makeInt(value) {
    value = parseInt(value);
    if (isNaN(value)) {
        value = 0;
    }
    return value;
}

function constrainAcceleration(value) {
    return parseFloat(value).toFixed(2);
}

module.exports = {
    updateAxis: updateAxis,
    updateRotation: updateRotation,
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
    get alpha() {
        return _axis.alpha;
    },
    get beta() {
        return _axis.beta;
    },
    get gamma() {
        return _axis.gamma;
    },
    ACCELEROMETER_REPORT_INTERVAL: ACCELEROMETER_REPORT_INTERVAL,
    G_CONSTANT: G_CONSTANT
};
