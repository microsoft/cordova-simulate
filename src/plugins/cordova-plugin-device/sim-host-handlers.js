// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    'Device': {
        'getDeviceInfo': function (success, fail, args) {
            success({
                model: document.getElementById('device-model').value,
                manufacturer: document.getElementById('device-manufacturer').value,
                platform: document.getElementById('device-platform').value,
                uuid: document.getElementById('device-uuid').value,
                version: document.getElementById('device-version').value,
                isVirtual: document.getElementById('is-virtual-device').checked,
                serial: document.getElementById('device-serial').value
            });
        }
    }
};
