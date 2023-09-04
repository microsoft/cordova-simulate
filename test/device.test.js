// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

const assert = require('assert');
var Device = require('../src/server/device');

suite('deviceUtils', function () {
    test('Should get default device correctly for each platform', (done) => {
        const defaultAndroidDevice = Device.getDefaultDevice('android');
        assert.strictEqual('Nexus6', defaultAndroidDevice.id);
        const defaultIosDevice = Device.getDefaultDevice('ios');
        assert.strictEqual('iPhone12', defaultIosDevice.id);
        const defaultWindowsDevice = Device.getDefaultDevice('windows');
        assert.strictEqual('Lumia950', defaultWindowsDevice.id);
        done();
    });

    test('Should get default device if the target device id is not existing in specific platform', (done) => {
        const device = Device.getDevice('android', 'iPhone11');
        assert.strictEqual('Nexus6', device.id);
        done();
    });

    test('Should throw error message if no user agent found', (done) => {
        const device = Device.getDevice('ios', 'iPhone12');
        device['os-version'] = '1';
        let error;
        try {
            Device.getUserAgent(device);
        } catch (err) {
            error = err.message;
        }
        assert.strictEqual('Cannot find user agent for device: iPhone 12, os-version: 1.', error);
        done();
    });

    test('Should get device info correctly', (done) => {
        const deviceInfo = Device.getDeviceInfo('ios', 'iPhone13');
        assert.strictEqual(deviceInfo.deviceId, 'iPhone13');
        assert.strictEqual(deviceInfo.platform, 'ios');
        assert.strictEqual(Object.keys(deviceInfo.platformDevices).length != 0, true);
        assert.strictEqual(deviceInfo.userAgent.includes('Mozilla') && deviceInfo.userAgent.includes('AppleWebKit'), true);
        done();
    });
});

