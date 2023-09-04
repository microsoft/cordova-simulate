// Copyright (c) Microsoft Corporation. All rights reserved.

var localStorage = require('./utils/local-storage'),
    log = require('./utils/log');

var allDevices;
var nonGenericPlatforms;
var genericDevices;
var deviceForPlatformKey = 'PLATFORM_DEVICE';
var allUserAgents;
var defaultPlatform = 'browser';
var defaultSerial = '123456789';

function getDeviceInfo(platform, deviceId) {
    var device = findDevice(platform, deviceId);
    return {
        deviceId: device.id,
        platform: device.platform,
        platformDevices: getPlatformDevices(device.platform),
        userAgent: getUserAgent(device)
    };
}

function updateDeviceInfo(device) {
    var deviceId = device.id;
    var platform = device.platform;
    var platformDevices = getPlatformDevices(platform);
    platformDevices[deviceId] = device;

    saveDefaultDeviceIdForPlatform(platform, deviceId);

    return {
        deviceId: deviceId,
        platform: platform,
        platformDevices: platformDevices,
        userAgent: getUserAgent(device)
    };
}

function findDevice(platform, deviceId) {
    return deviceId ? getDevice(platform, deviceId) : getDefaultDevice(platform || defaultPlatform);
}

function getPlatformDevices(platform) {
    initializeDevices();

    var platformDevices = allDevices[platform];
    if (!platformDevices) {
        // If we haven't defined devices for this platform, copy our generic devices.
        platformDevices = Object.assign({}, genericDevices);

        Object.getOwnPropertyNames(platformDevices).forEach(function (deviceId) {
            platformDevices[deviceId].platform = platform;
        });
        allDevices[platform] = platformDevices;
    }

    return platformDevices;
}

function getUserAgent(device) {
    allUserAgents = allUserAgents || require('../devices/user-agents.json');
    var platform = device.platform;
    var platformUserAgents = allUserAgents[platform];
    if (!platformUserAgents) {
        return '';
    }

    var userAgent = platformUserAgents[device['os-version']];

    if (!userAgent) {
        throw new Error(`Cannot find user agent for device: ${device.name}, os-version: ${device['os-version']}.`);
    }
    
    if (typeof userAgent === 'object') {
        userAgent = userAgent[device['desktop-user-agent'] ? 'desktop' : 'phone'];
    }

    userAgent = userAgent.replace('<user-agent-name>', device['user-agent-name'] || device['name']);

    if (platform === 'ios') {
        var isIPad = device.name.indexOf('iPad') == 0;
        userAgent = userAgent.replace('<device-type>', isIPad ? 'iPad' : 'iPhone')
            .replace('<os-name>', isIPad ? 'OS' : 'iPhone OS');
    }

    if (platform === 'windows') {
        userAgent = userAgent.replace('<manufacturer>', device.manufacturer)
            .replace('<device-name>', device.name);
    }

    return userAgent;
}

function getDevice(platform, deviceId) {
    var device;
    initializeDevices();

    // If platform is specified, look at devices for that platform
    if (platform) {
        device = getPlatformDevices(platform)[deviceId];
        if (!device) {
            // Not a valid device id for this platform - revert to default
            device = getDefaultDevice(platform);
            log.warning('Device \'' + deviceId + '\' is not available for platform \'' + platform + '\'. Reverting device to \'' + device.id + '\'.');
        }
        return device;
    }

    // Look to see if there is a generic device with the specified id, in which case we'll default platform to browser.
    if (genericDevices[deviceId]) {
        return getPlatformDevices(defaultPlatform)[deviceId];
    }

    // Otherwise step through platforms with non-generic devices to see if the id is specified there.
    nonGenericPlatforms.some(function (platform) {
        device = getPlatformDevices(platform)[deviceId];
        return !!device;
    });

    if (!device) {
        device = getDefaultDevice(defaultPlatform);
        log.warning('Could not find device \'' + deviceId + '\'. Defaulting to device \'' + device.id + '\' for platform \'' + device.platform + '\'.');
    }

    return device;
}

function initializeDevices() {
    if (!allDevices) {
        // Devices for a platform are by default stored in an array. Switch them to be indexed by device id.
        allDevices = require('../devices/devices.json');
        Object.getOwnPropertyNames(allDevices).forEach(function (devicePlatform) {
            allDevices[devicePlatform] = allDevices[devicePlatform].reduce(function (result, current) {
                if (current['default-os-version']) {
                    current['os-version'] = current['default-os-version'];
                }
                current.platform = devicePlatform;
                current.serial = defaultSerial;
                result[current.id] = current;
                return result;
            }, {});
        });

        // Stored generic devices separately - they'll be added to allDevices for specific platforms as requested
        genericDevices = allDevices.generic;
        delete allDevices.generic;
        nonGenericPlatforms = Object.getOwnPropertyNames(allDevices);
    }
}

function getDefaultDevice(platform) {
    var platformDevices = getPlatformDevices(platform);
    var defaultDevice;

    var defaultDeviceId = retrieveDefaultDeviceIdForPlatform(platform);
    if (defaultDeviceId) {
        defaultDevice = platformDevices[defaultDeviceId];
        if (defaultDevice) {
            return defaultDevice;
        }
    }

    Object.getOwnPropertyNames(platformDevices).some(function (deviceId) {
        var device = platformDevices[deviceId];
        if (device.default) {
            defaultDevice = device;
            return true;
        }
        if (!defaultDevice) {
            // In case we don't find a device identified as the default
            defaultDevice = device;
        }
        return false;
    });

    saveDefaultDeviceIdForPlatform(platform, defaultDevice.id);
    return defaultDevice;
}

function retrieveDefaultDeviceIdForPlatform(platform) {
    var defaultDevicesForPlatform = localStorage.getItem(deviceForPlatformKey) || {};
    return defaultDevicesForPlatform[platform.toUpperCase()];
}

function saveDefaultDeviceIdForPlatform(platform, deviceId) {
    var defaultDevicesForPlatform = localStorage.getItem(deviceForPlatformKey) || {};
    defaultDevicesForPlatform[platform.toUpperCase()] = deviceId;
    localStorage.setItem(deviceForPlatformKey, defaultDevicesForPlatform);
}

module.exports = {
    getDeviceInfo: getDeviceInfo,
    updateDeviceInfo: updateDeviceInfo,
    getDefaultDevice: getDefaultDevice,
    getDevice: getDevice,
    getUserAgent: getUserAgent
};