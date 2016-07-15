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

// For telemetry about dragging the 3D device in the accelerometer panel, we "batch" the mouse drag events to prevent sending too many messages.
var mouseDragEventHoldDelay = 1000; // The inactivity delay to wait before sending a telemetry event when the user rotates the 3D device.
var pendingMouseDragEvents = 0; // The number of mouse drag events that are "on hold".

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
    _alpha,
    _beta,
    _gamma,
    _shape =
        //
        // The front side
        //
        // x, y, z      x, y, z         x, y, z
        // for some strange reason for y -100 is top, 100 is bottom
        '-30,30,10,     30,30,10,       30,60,10,       100,100,100,-1,0;' + // top left, top right, bottom right - of the right triangle
        '-30,30,10,     30,60,10,       -30,60,10,      100,100,100,-1,0;' + // top left, right bottom, left bottom - of the left triangle
        // front side 'the phone display'
        '-20,-50,11,    20,-50,11,      20,20,11,       100,100,100,-1,0;' +
        '-20,-50,11,    20,20,11,       -20,20,11,      100,100,100,-1,0;' +
        // below the display
        '-30,30,10,     30,20,10,       30,30,10,       0,0,0,-1,0;' +
        '-30,30,10,     -30,20,10,      30,20,10,       0,0,0,-1,0;' +
        // above the display
        '-30,-60,10,    30,-60,10,      30,-50,10,      0,0,0,-1,0;' +
        '-30,-60,10,    30,-50,10,      -30,-50,10,     0,0,0,-1,0;' +
        // left of the display
        '-30,-50,10,    -20,-50,10,     -20,20,10,      0,0,0,-1,0;' +
        '-30,-50,10,    -20,20,10,      -30,20,10,      0,0,0,-1,0;' +
        // right of the display
        '20,-50,10,     30,-50,10,      30,20,10,       0,0,0,-1,0;' +
        '20,-50,10,     30,20,10,       20,20,10,       0,0,0,-1,0;' +


        // back side, opposite side to the above one
        '-30,-60,-10,   30,60,-10,      30,-60,-10,     0,0,0,-1,0;' +
        '-30,-60,-10,   -30,60,-10,     30,60,-10,      0,00,-1,0;' +
        // right side
        '30,-60,-10,    30,60,-10,      30,60,10,       50,50,80,-1,0;' +
        '30,-60,-10,    30,60,10,       30,-60,10,      50,50,80,-1,0;' +
        // left side
        '-30,-60,-10,   -30,60,10,      -30,60,-10,     50,50,80,-1,0;' +
        '-30,-60,-10,   -30,-60,10,     -30,60,10,      50,50,80,-1,0;' +

        // top
        '30,-60,-10,    -30,-60,10, -30,-60,-10,    50,80,50,-1,0;' +
        '30,-60,-10,    30,-60,10,      -30,-60,10, 50,80,50,-1,0;' +
        // bottom
        '30,60,-10, -30,60,-10,     -30,60,10,      80,50,50,-1,0;' +
        '30,60,-10, -30,60,10,      30,60,10,       80,50,50,-1,0';

var G_CONSTANT = 9.81;

var recordedGestures = [
    {
        name: 'Shake',
        fn: shake
    }
];

function initialize() {
    axisX = document.getElementById('accel-x');
    axisY = document.getElementById('accel-y');
    axisZ = document.getElementById('accel-z');
    alpha = document.getElementById('accel-alpha');
    beta = document.getElementById('accel-beta');
    gamma = document.getElementById('accel-gamma');

    deviceMotionModel.addAxisChangeCallback(function (axis) {
        if (axis.hasOwnProperty('x')) axisX.value = axis.x;
        if (axis.hasOwnProperty('y')) axisY.value = axis.y;
        if (axis.hasOwnProperty('z')) axisZ.value = axis.z;
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
    var accel = { x: 0, y: 0, z: -1 };

    _alpha = 0;
    _beta = 0;
    _gamma = 0;
    _deltaAlpha = 360;

    _oldX = 0;
    _oldY = 0;
    _oldAlphaX = 0;
    _offsets = {
        x: accel.x,
        y: accel.y,
        z: accel.z
    };

    deviceMotionModel.updateAxis({
        x: (accel.x * G_CONSTANT).toFixed(2),
        y: (accel.y * G_CONSTANT).toFixed(2),
        z: (accel.z * G_CONSTANT).toFixed(2)
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
            x: (value * G_CONSTANT).toFixed(2)
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
    var node = document.getElementById('accelerometer-canvas'),
        cosX, sinX, cosY, sinY;

    ThreeDee.setCenter(defaultXAxis, defaultYAxis);
    ThreeDee.setLight(-300, -300, 800);

    node.addEventListener('mousemove', function (e) {
        if (_mouseDown) {
            if (!_shiftKeyDown) {
                _offsets.x = (_offsets.x + _oldX - e.offsetX) % 360;
                _offsets.y = (_offsets.y + _oldY - e.offsetY) % 360;

                _alpha = _alpha || 0;

                // enforce gamma in [-90,90] as per w3c spec
                _gamma = -_offsets.x;
                if (_gamma < -90) {
                    _gamma = -90;
                }
                if (_gamma > 90) {
                    _gamma = 90;
                }

                // enforce beta in [-180,180] as per w3c spec
                _beta = -_offsets.y % 360;
                if (_beta < -180) {
                    _beta += 360;
                }
                else if (_beta >= 180) {
                    _beta -= 360;
                }

                cosX = Math.cos((_gamma) * (Math.PI / 180));
                sinX = Math.sin((_gamma) * (Math.PI / 180));
                cosY = Math.cos((_beta) * (Math.PI / 180));
                sinY = Math.sin((_beta) * (Math.PI / 180));

                deviceMotionModel.updateAxis({
                    x: (cosY * sinX * G_CONSTANT).toFixed(2),
                    y: (-sinY * G_CONSTANT).toFixed(2),
                    z: (-cosY * cosX * G_CONSTANT).toFixed(2)
                });

                beta.value = _beta;
                gamma.value = _gamma;

            } else {
                _deltaAlpha = (_deltaAlpha - (_oldAlphaX - e.offsetX) * 2.5) % 360;
                _alpha = (360 - _deltaAlpha) % 360;

                alpha.value = _alpha;
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

        updateCanvas(_deltaAlpha, -_beta, _gamma);
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
