// Copyright (c) Microsoft Corporation. All rights reserved.

var telemetry = require('telemetry-helper');

var osVersions;

var currentDeviceId;
var devicesById;
var isVirtual = true;
var baseProps;

var versionMap = {
    'windows': {
        '8.1': '6.3.9600.0',
        '10': '10.0.143939.0'
    }
};

var displayedPlatforms = {
    'android': 'Android',
    'ios': 'iOS',
    'windows': 'Windows'
};

var devicePluginPlatformMap = {
    'android': 'Android',
    'ios': 'iOS',
    'osx': 'Mac OS X',
    'ubuntu': 'Linux'
};

module.exports = {
    init: function (deviceInfo, props) {
        currentDeviceId = deviceInfo.deviceId;
        devicesById = deviceInfo.platformDevices;
        baseProps = props;
    },

    selectDevice: function (deviceId) {
        currentDeviceId = deviceId;
        return getCurrentDevice();
    }
};

Object.defineProperties(module.exports, {
    osVersions: {
        get: function () {
            osVersions = osVersions || require('../../devices/os-versions.json');
            return osVersions[getCurrentDevice().platform];
        }
    },

    currentDevice: {
        get: function () {
            return getCurrentDevice();
        }
    },

    devicesById: {
        get: function () {
            return devicesById;
        }
    },

    isVirtual: {
        get: function () {
            return isVirtual;
        },
        set: function(value) {
            if (value !== isVirtual) {
                isVirtual = value;
                telemetry.sendUITelemetry(Object.assign({}, baseProps, {control: 'is-virtual-device'}));
            }
        }
    },

    /**
     * The "pretty" platform value we display
     */
    displayedPlatform: {
        get: function () {
            // The "pretty" platform string we dispoly
            var platform = getCurrentDevice().platform;
            var displayedPlatform = displayedPlatforms[platform];
            if (!displayedPlatform) {
                displayedPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);
                displayedPlatforms[platform] = displayedPlatform;
            }
            return displayedPlatform;
        }
    },

    /**
     * The "platform" value we provide the device plugin
     */
    currentDevicePlatform: {
        get: function () {
            var platform = getCurrentDevice().platform;
            return devicePluginPlatformMap[platform] || platform;
        }
    },

    currentDeviceVersion: {
        get: function () {
            var device = getCurrentDevice();
            var osVersion = device['os-version'];
            var versionTemplate = device['device-version-template'];
            if (versionTemplate === '<os-version>') {
                return osVersion;
            }

            if (versionTemplate === '<map-os-version>') {
                var platform = device.platform;
                var mappedVersion = versionMap[platform] && versionMap[platform][osVersion];
                return mappedVersion || '(unknown)';
            }
            return versionTemplate;
        }
    }
});

function getCurrentDevice() {
    return devicesById[currentDeviceId];
}
