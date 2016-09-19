// Copyright (c) Microsoft Corporation. All rights reserved.

var deviceModel = require('./device-model');

module.exports = {
    'Device': {
        'getDeviceInfo': function (success, fail, args) {
            var device = deviceModel.currentDevice;
            success({
                model: device.model,
                manufacturer: device.manufacturer,
                platform: deviceModel.currentDevicePlatform,
                uuid: device.uuid,
                version: deviceModel.currentDeviceVersion,
                isVirtual: deviceModel.isVirtual,
                serial: device.serial
            });
        }
    }
};
