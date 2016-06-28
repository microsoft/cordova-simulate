// Copyright (c) Microsoft Corporation. All rights reserved.

var db = require('db');
var telemetry = require('telemetry-helper');

var baseProps = {
    plugin: 'viewport',
    panel: 'viewport'
};
var DEVICES = [
    { 'id': 'AcerA500', 'name': 'Acer A500', 'width': 800, 'height': 1280 },
    { 'id': 'Bold9700', 'name': 'BlackBerry Bold 9700', 'width': 480, 'height': 360 },
    { 'id': 'Bold9900', 'name': 'BlackBerry Bold 9900', 'width': 640, 'height': 480 },
    { 'id': 'Curve9300', 'name': 'BlackBerry Curve 9300', 'width': 320, 'height': 240 },
    { 'id': 'Curve9350-9360-9370', 'name': 'BlackBerry Curve 9350/9360/9370', 'width': 480, 'height': 360 },
    { 'id': 'FWVGA', 'name': 'Generic - FWVGA (480x854)', 'width': 480, 'height': 854 },
    { 'id': 'G1', 'name': 'HTC G1', 'width': 320, 'height': 480 },
    { 'id': 'HPPre3', 'name': 'HP Pre 3', 'width': 480, 'height': 800 },
    { 'id': 'HPVeer', 'name': 'HP Veer', 'width': 320, 'height': 400 },
    { 'id': 'HVGA', 'name': 'Generic - HVGA (320x480)', 'width': 320, 'height': 480 },
    { 'id': 'iPad', 'name': 'iPad', 'width': 768, 'height': 1024 },
    { 'id': 'iPad3', 'name': 'iPad 3', 'width': 1536, 'height': 2048 },
    { 'id': 'iPhone3', 'name': 'iPhone 3G/3Gs', 'width': 320, 'height': 480 },
    { 'id': 'iPhone4', 'name': 'iPhone 4/4s', 'width': 640, 'height': 960 },
    { 'id': 'iPhone5', 'name': 'iPhone 5', 'width': 640, 'height': 1136 },
    { 'id': 'Legend', 'name': 'HTC Legend', 'width': 320, 'height': 480 },
    { 'id': 'Nexus', 'name': 'Nexus One', 'width': 480, 'height': 800 },
    { 'id': 'Nexus4', 'name': 'Nexus 4', 'width': 768, 'height': 1280 },
    { 'id': 'Nexus7', 'name': 'Nexus 7 (Tablet)', 'width': 800, 'height': 1280 },
    { 'id': 'NexusGalaxy', 'name': 'Nexus (Galaxy)', 'width': 720, 'height': 1280 },
    { 'id': 'NexusS', 'name': 'Nexus S', 'width': 480, 'height': 800 },
    { 'id': 'NokiaN8', 'name': 'Nokia N8', 'width': 360, 'height': 640 },
    { 'id': 'NokiaN97', 'name': 'Nokia N97/5800 (touch)', 'width': 360, 'height': 640 },
    { 'id': 'PalmPre', 'name': 'Palm Pre', 'width': 320, 'height': 480 },
    { 'id': 'PalmPre2', 'name': 'Palm Pre 2', 'width': 320, 'height': 480 },
    { 'id': 'Pearl9100', 'name': 'BlackBerry Pearl 9100', 'width': 360, 'height': 400 },
    { 'id': 'Playbook', 'name': 'BlackBerry Playbook', 'width': 1024, 'height': 600 },
    { 'id': 'Q10', 'name': 'BlackBerry Q10', 'width': 720, 'height': 720 },
    { 'id': 'QVGA', 'name': 'Generic - QVGA (240X320)', 'width': 240, 'height': 320 },
    { 'id': 'Style9670', 'name': 'BlackBerry Style 9670', 'width': 360, 'height': 400 },
    { 'id': 'Tattoo', 'name': 'HTC Tattoo', 'width': 240, 'height': 320 },
    { 'id': 'Torch9800', 'name': 'BlackBerry Torch 9800', 'width': 360, 'height': 480 },
    { 'id': 'Torch9810', 'name': 'BlackBerry Torch 9810', 'width': 480, 'height': 640 },
    { 'id': 'Torch9860-9850', 'name': 'BlackBerry Torch 9860/9850', 'width': 480, 'height': 800 },
    { 'id': 'Wave', 'name': 'Samsung Wave', 'width': 480, 'height': 800 },
    { 'id': 'WQVGA', 'name': 'Generic - WQVGA (240x480)', 'width': 240, 'height': 400 },
    { 'id': 'WVGA', 'name': 'Generic - WVGA (480x800)', 'width': 480, 'height': 800 },
    { 'id': 'Z10', 'name': 'BlackBerry Z10', 'width': 768, 'height': 1280 }
];
var CONSTANTS = {
    dbKey: {
        viewportMode: 'VIEWPORT_MODE_KEY',
        selectedDevice: 'VIEWPORT_SELECTED_DEVICE_KEY',
        width: 'VIEWPORT_CUSTOM_WIDTH_KEY',
        height: 'VIEWPORT_CUSTOM_HEIGHT_KEY'
    },
    id: {
        desktop: 'viewport-desktop',
        device: 'viewport-device',
        custom: 'viewport-custom'
    }
}

var previousViewportSelection;

module.exports = function (messages) {
    function initialize() {
        // Populate predefined device list
        var deviceList = document.getElementById('viewport-device-list');

        DEVICES.forEach(function (device) {
            var option = document.createElement('option');
            option.value = device.id;

            var caption = document.createTextNode(device.name);
            option.appendChild(caption);

            option.setAttribute('_width', device.width);
            option.setAttribute('_height', device.height);

            deviceList.appendChild(option);
        });

        // Handle radio button change
        document.getElementById(CONSTANTS.id.desktop).onclick = handleRadioClick.bind(null, CONSTANTS.id.desktop);
        document.getElementById(CONSTANTS.id.device).onclick = handleRadioClick.bind(null, CONSTANTS.id.device);
        document.getElementById(CONSTANTS.id.custom).onclick = handleRadioClick.bind(null, CONSTANTS.id.custom);

        // Handle custom dimensions change
        var customWidthTextEntry = document.getElementById('viewport-custom-width');
        var customHeightTextEntry = document.getElementById('viewport-custom-height');

        customWidthTextEntry.addEventListener('change', handleChangeCustomDimension.bind(null, 'width'));
        customHeightTextEntry.addEventListener('change', handleChangeCustomDimension.bind(null, 'height'));

        // Set initial values
        var customDimensions = {
            width: db.retrieve(CONSTANTS.dbKey.width) || 480,
            height: db.retrieve(CONSTANTS.dbKey.height) || 800
        };
        var selectedDevice = db.retrieve(CONSTANTS.dbKey.selectedDevice) || 'WQVGA';

        previousViewportSelection = db.retrieve(CONSTANTS.dbKey.viewportMode) || CONSTANTS.id.desktop;
        document.getElementById(previousViewportSelection).checked = true;
        deviceList.value = selectedDevice;
        customWidthTextEntry.value = customDimensions.width;
        customHeightTextEntry.value = customDimensions.height;

        if (previousViewportSelection === CONSTANTS.id.device) {
            // Even though we have just set deviceList.value, the shadow DOM actually sets that value asynchronously,
            // so we can't rely on deviceList.options[deviceList.selectedIndex] to retrieve the device dimensions.
            // Manually look for the device ID in our list of devices instead.
            for (var i = 0; i < DEVICES.length; ++i) {
                var device = DEVICES[i];

                if (device.id === selectedDevice) {
                    notifyResize({
                        width: device.width,
                        height: device.height
                    });

                    break;
                }
            }
        } else if (previousViewportSelection === CONSTANTS.id.custom) {
            notifyResize(customDimensions);
        }

        // Handle device list selection change
        deviceList.addEventListener('change', handleSelectDevice.bind(null, false));

        // Register telemetry
        registerTelemetryEvents();
    }

    function handleRadioClick(radioName) {
        if (radioName !== previousViewportSelection) {
            previousViewportSelection = radioName;
            telemetry.sendUITelemetry(Object.assign({}, baseProps, { control: radioName }));
            db.save(CONSTANTS.dbKey.viewportMode, radioName);

            switch (radioName) {
                case CONSTANTS.id.desktop:
                    messages.emitDebug('reset-viewport');
                    break;
                case CONSTANTS.id.device:
                    handleSelectDevice(true);
                    break;
                case CONSTANTS.id.custom:
                    notifyResize({
                        width: document.getElementById('viewport-custom-width').value,
                        height: document.getElementById('viewport-custom-height').value
                    });
            }
        }
    }

    function handleSelectDevice(forceUpdateViewport) {
        var deviceList = document.getElementById('viewport-device-list');
        var option = deviceList.options[deviceList.selectedIndex];

        // Do not save the device value if this is a forced update - a forced update means we are applying the current
        // selected device, not changing the selected device itself.
        if (!forceUpdateViewport) {
            db.save(CONSTANTS.dbKey.selectedDevice, option.value);
        }

        if (forceUpdateViewport || document.getElementById(CONSTANTS.id.device).checked) {
            notifyResize({
                width: option.getAttribute('_width'),
                height: option.getAttribute('_height')
            });
        }
    }

    function handleChangeCustomDimension(dimensionName, e) {
        // Make sure the new value is an integer
        var newValue = parseInt(e.target.value);

        if (isNaN(newValue)) {
            return;
        }

        db.save(CONSTANTS.dbKey[dimensionName], newValue);

        // Resize the viewport if custom dimensions are selected
        if (document.getElementById(CONSTANTS.id.custom).checked) {
            var dimensions = {};

            dimensions[dimensionName] = newValue;
            notifyResize(dimensions);
        }
    }

    function notifyResize(dimensions) {
        var width = parseInt(dimensions.width || document.getElementById('viewport-custom-width').value);
        var height = parseInt(dimensions.height || document.getElementById('viewport-custom-height').value);

        if (isNaN(width) || isNaN(height)) {
            return;
        }

        messages.emitDebug('resize-viewport', {
            width: width,
            height: height
        });
    }

    function registerTelemetryForControl(controlId) {
        document.getElementById(controlId).addEventListener('change', telemetry.sendUITelemetry.bind(this, Object.assign({}, baseProps, {
            control: controlId
        })));
    }

    function registerTelemetryEvents() {
        // Register the simple events (onchange -> send the control ID).
        var basicTelemetryEventControls = [
            'viewport-custom-width',
            'viewport-custom-height'
        ];

        basicTelemetryEventControls.forEach(function (controlId) {
            registerTelemetryForControl(controlId);
        });

        // Register the event for the device combo box.
        var deviceList = document.getElementById('viewport-device-list');

        deviceList.addEventListener('change', function () {
            var option = deviceList.options[deviceList.selectedIndex];

            telemetry.sendUITelemetry(Object.assign({}, baseProps, {
                control: 'viewport-device-list',
                value: option.value
            }));
        });
    }

    return {
        initialize: initialize
    };
};
