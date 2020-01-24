// Copyright (c) Microsoft Corporation. All rights reserved.

// https://github.com/apache/cordova-plugin-device-motion/

/*global ThreeDee: false, Draw: false */

require('./3d');
require('./draw');
var telemetry = require('telemetry-helper'),
    deviceMotionModel = require('./device-motion-model');

var baseProps = {
    plugin: 'cordova-plugin-device-motion',
    panel: 'accelerometer'
};

// For telemetry about dragging the 3D device in the accelerometer panel, we 'batch' the mouse drag events to prevent sending too many messages.
var mouseDragEventHoldDelay = 1000; // The inactivity delay to wait before sending a telemetry event when the user rotates the 3D device.
var pendingMouseDragEvents = 0; // The number of mouse drag events that are 'on hold'.

var axisX,
    axisY,
    axisZ,
    alpha,
    beta,
    gamma;

var defaultXAxis = 100,
    defaultYAxis = 80;

var _mouseDown,
    _shiftKeyDown = false,
    _offsets,
    _oldX,
    _oldY,
    _oldAlphaX,
    _deltaAlpha,
    _shape = require('./device-mesh.json');

var recordedGestures = [
    {
        name: 'Shake',
        fn: shake
    }
];

function updateAccel() {
    deviceMotionModel.updateAxis(getUiValues());
    _deltaAlpha = 360 - deviceMotionModel.alpha;
    updateCanvas(_deltaAlpha, -deviceMotionModel.beta, deviceMotionModel.gamma);
}

function updateRotation() {
    deviceMotionModel.updateRotation(getUiValues());
    _deltaAlpha = 360 - deviceMotionModel.alpha;
    updateCanvas(_deltaAlpha, -deviceMotionModel.beta, deviceMotionModel.gamma);
}

function getUiValues() {
    return {
        x: axisX.value,
        y: axisY.value,
        z: axisZ.value,
        alpha: alpha.value,
        beta: beta.value,
        gamma: gamma.value
    };
}

function initialize() {
    axisX = document.getElementById('accel-x');
    axisY = document.getElementById('accel-y');
    axisZ = document.getElementById('accel-z');
    alpha = document.getElementById('accel-alpha');
    beta = document.getElementById('accel-beta');
    gamma = document.getElementById('accel-gamma');

    axisX.addEventListener('change', updateAccel);
    axisY.addEventListener('change', updateAccel);
    axisZ.addEventListener('change', updateAccel);
    alpha.addEventListener('change', updateRotation);
    beta.addEventListener('change', updateRotation);
    gamma.addEventListener('change', updateRotation);

    deviceMotionModel.addAxisChangeCallback(function (axis) {
        if (axis.hasOwnProperty('x')) axisX.value = axis.x;
        if (axis.hasOwnProperty('y')) axisY.value = axis.y;
        if (axis.hasOwnProperty('z')) axisZ.value = axis.z;
        if (axis.hasOwnProperty('alpha')) alpha.value = axis.alpha;
        if (axis.hasOwnProperty('beta')) beta.value = axis.beta;
        if (axis.hasOwnProperty('gamma')) gamma.value = axis.gamma;
    });

    createCanvas();

    setToDefaultPosition();

    var recordedGesturesList = document.getElementById('accel-recorded-data');
    recordedGestures.forEach(function (gesture) {
        var option = document.createElement('option');
        option.appendChild(document.createTextNode(gesture.name));
        recordedGesturesList.appendChild(option);
    });

    document.getElementById('accel-play-recorded').addEventListener('click', function () {
        var list = document.getElementById('accel-recorded-data');
        telemetry.sendUITelemetry(Object.assign({}, baseProps, { control: 'accel-play-recorded', value: recordedGestures[list.selectedIndex].name }));
        recordedGestures[list.selectedIndex].fn();
    });
}

function setToDefaultPosition() {
    var x = 0,
        y = 0,
        z = -1;

    _deltaAlpha = 360;

    _oldX = 0;
    _oldY = 0;
    _oldAlphaX = 0;
    _offsets = {x: x, y: y, z: z};

    deviceMotionModel.updateAxis({
        x: x * deviceMotionModel.G_CONSTANT,
        y: y * deviceMotionModel.G_CONSTANT,
        z: z * deviceMotionModel.G_CONSTANT
    });

    updateCanvas(0, 0);
}

function shake() {
    var id,
        count = 1,
        stopCount = 2500 / deviceMotionModel.ACCELEROMETER_REPORT_INTERVAL,
        oldX = deviceMotionModel.x;

    id = setInterval(function () {
        var freq = 1,
            amp = 20,
            value = Math.round(amp * Math.sin(freq * count * (180 / Math.PI)) * 100) / 100;

        if (count > stopCount) {
            updateCanvasCenter(defaultXAxis, defaultYAxis);
            deviceMotionModel.updateAxis({
                x: oldX
            });
            clearInterval(id);
            return;
        }

        deviceMotionModel.updateAxis({
            x: value * deviceMotionModel.G_CONSTANT
        });
        // shake effect
        var center = Math.random() * 10 + (defaultXAxis - 5);
        updateCanvasCenter(center, defaultYAxis);
        count++;
    }, deviceMotionModel.ACCELEROMETER_REPORT_INTERVAL);
}

function updateCanvasCenter(xAxis, yAxis) {
    ThreeDee.setCenter(xAxis, yAxis);
    Draw.initialize(document.getElementById('accelerometer-canvas'));
    Draw.clear(0, 0, 480, 300);
    Draw.drawScene(ThreeDee.getTranslation(), 3);
}

function updateCanvas(a, b, g) {
    ThreeDee.loadMesh(_shape);
    g = g || 0;
    ThreeDee.rotate(0, g, 0);
    ThreeDee.rotate(b, 0, a);
    ThreeDee.backface();
    ThreeDee.shade();
    ThreeDee.zSort();
    Draw.initialize(document.getElementById('accelerometer-canvas'));
    Draw.clear(0, 0, 480, 300);
    Draw.drawScene(ThreeDee.getTranslation(), 3);
}

function createCanvas() {
    var node = document.getElementById('accelerometer-canvas');

    ThreeDee.setCenter(defaultXAxis, defaultYAxis);
    ThreeDee.setLight(-300, -300, 800);

    node.addEventListener('mousemove', function (e) {
        if (_mouseDown) {
            if (!_shiftKeyDown) {
                _offsets.x = (_offsets.x + _oldX - e.offsetX) % 360;
                _offsets.y = (_offsets.y + _oldY - e.offsetY) % 360;
                deviceMotionModel.updateRotation({
                    alpha: deviceMotionModel.alpha,
                    beta: -_offsets.y % 360,
                    gamma: -_offsets.x
                });
            } else {
                _deltaAlpha = (_deltaAlpha - (_oldAlphaX - e.offsetX) * 2.5) % 360;
                deviceMotionModel.updateRotation({
                    alpha: Math.round((360 - _deltaAlpha) % 360),
                    beta: deviceMotionModel.beta,
                    gamma: deviceMotionModel.gamma
                });
            }

            pendingMouseDragEvents++;
            setTimeout(function () {
                --pendingMouseDragEvents;

                if (pendingMouseDragEvents === 0) {
                    telemetry.sendUITelemetry(Object.assign({}, baseProps, { control: 'accelerometer-canvas' }));
                }
            }, mouseDragEventHoldDelay);
        }

        _oldX = e.offsetX;
        _oldY = e.offsetY;
        _oldAlphaX = e.offsetX;

        updateCanvas(_deltaAlpha, -deviceMotionModel.beta, deviceMotionModel.gamma);
    });

    node.addEventListener('mousedown', function (e) {
        _oldX = e.offsetX;
        _oldY = e.offsetY;
        _mouseDown = true;
    });

    node.addEventListener('mouseup', function () {
        _mouseDown = false;
    });

    document.addEventListener('mouseup', function () {
        //Catch mouseup events that fire when outside canvas bounds
        _mouseDown = false;
    });

    document.addEventListener('keydown', function (e) {
        if (e.keyCode === 16) { // Shift Key
            _oldAlphaX = _oldX;
            _shiftKeyDown = true;
        }
    });

    document.addEventListener('keyup', function (e) {
        if (e.keyCode === 16) { // Shift Key
            _shiftKeyDown = false;
        }
    });

    return node;
}

module.exports = {
    initialize: initialize
};
