// Copyright (c) Microsoft Corporation. All rights reserved.

var telemetry = require('telemetry-helper'),
    simStatus = require('sim-status'),
    deviceModel = require('./device-model');

var baseProps = {
    plugin: 'cordova-plugin-device',
    panel: 'device'
};

function initialize(deviceInfo, messages) {
    deviceModel.init(deviceInfo, baseProps);

    var device = deviceModel.currentDevice;

    document.getElementById('device-platform').value = deviceModel.displayedPlatform;

    var deviceList = document.getElementById('device-list');
    getSortedDevices().forEach(function (device) {
        var option = document.createElement('option');
        option.value = device.id;

        var caption = document.createTextNode(device.name);
        option.appendChild(caption);
        deviceList.appendChild(option);
    });
    deviceList.addEventListener('change', selectedDeviceChanged);
    deviceList.value = device.id;

    var osVersions = deviceModel.osVersions;
    var osVersionList = document.getElementById('device-os-version');
    if (osVersions) {
        osVersions.forEach(function (version) {
            var option = document.createElement('option');
            option.value = version;

            var caption = document.createTextNode(version);
            option.appendChild(caption);
            osVersionList.appendChild(option);
        });
        osVersionList.style.display = '';
        osVersionList.addEventListener('change', osVersionChanged);
    } else {
        osVersionList.style.display = 'none';
    }

    updateDevice();
    registerTelemetryEvents();

    function selectedDeviceChanged() {
        var deviceId = this.value;
        deviceModel.selectDevice(deviceId);
        updateDevice();
        messages.refreshAppHost(deviceModel.currentDevice);
    }

    function osVersionChanged(e) {
        deviceModel.currentDevice['os-version'] = this.value;
        var device = deviceModel.currentDevice;
        document.getElementById('device-os-version').value = device['os-version'];
        messages.refreshAppHost(device);
    }

    function updateDevice() {
        var device = deviceModel.currentDevice;
        var viewportWidth = device.viewport.width;
        var viewportHeight = device.viewport.height;

        document.getElementById('device-os-version').value = device['os-version'];
        document.getElementById('device-model').value = device.model;
        document.getElementById('device-manufacturer').value = device.manufacturer;
        document.getElementById('device-uuid').value = device.uuid;
        document.getElementById('device-version').value = deviceModel.currentDeviceVersion;
        document.getElementById('is-virtual-device').checked = deviceModel.isVirtual;
        document.getElementById('device-serial').value = device.serial;
        document.getElementById('device-resolution').value = device.resolution.width + ' x ' + device.resolution.height;
        document.getElementById('device-viewport-size').value = viewportWidth + ' x ' + viewportHeight;
        document.getElementById('device-pixel-ratio').value = device['pixel-ratio'];

        notifyResize(messages, {
            width: viewportWidth,
            height: viewportHeight,
            pixelRatio: device['pixel-ratio']
        });
    }
}

function getSortedDevices() {
    // Created a sorted array of devices
    var devicesById = deviceModel.devicesById;
    var devices = Object.getOwnPropertyNames(devicesById).map(function (deviceId) {
        return devicesById[deviceId];
    });

    devices.sort(function (left, right) {
        left = left.name.toUpperCase();
        right = right.name.toUpperCase();
        if (left < right) {
            return -1;
        }
        if (right < left) {
            return 1;
        }
        return 0;
    });

    return devices;
}

function notifyResize(messages, dimensions) {
    var width = parseInt(dimensions.width);
    var height = parseInt(dimensions.height);
    var pixelRatio = parseFloat(dimensions.pixelRatio);

    if (isNaN(width) || isNaN(height)) {
        return;
    }

    messages.emitDebug('resize-viewport', {
        width: width,
        height: height,
        pixelRatio: pixelRatio
    });
}

function registerTelemetryEvents() {
    var deviceList = document.getElementById('device-list');
    deviceList.addEventListener('change', function () {
        telemetry.sendUITelemetry(Object.assign({}, baseProps, {
            control: 'device-list',
            value: deviceList.value
        }));
    });

    var osVersionList = document.getElementById('device-os-version');
    osVersionList.addEventListener('change', function () {
        telemetry.sendUITelemetry(Object.assign({}, baseProps, {
            control: 'device-os-version',
            value: deviceList.value
        }));
    });

    var virtualDeviceCheckbox = document.getElementById('is-virtual-device');
    virtualDeviceCheckbox.addEventListener('click', function () {
        deviceModel.isVirtual = virtualDeviceCheckbox.checked;
    });
}

module.exports = function (messages) {
    var cordovaVersionLabel = document.getElementById('device-cordova-version');

    cordovaVersionLabel.value = 'Querying...';

    simStatus.whenAppHostReady(function () {
        messages.call('cordova-version').then(function (version) {
            cordovaVersionLabel.value = version;
        }).catch(function () {
            cordovaVersionLabel.value = 'unknown';
        });
    });

    return {
        initialize: function (deviceInfo) {
            initialize(deviceInfo, messages);
        }
    };
};
