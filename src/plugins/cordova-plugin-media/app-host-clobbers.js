// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    // This variable is required on Windows so that plugins tests works
    Windows: {
        Media: {
            Devices: {
                MediaDevice: {
                    // Used in Media autotests to detect whether audio is supported
                    getDefaultAudioRenderId: function () {
                        return true;
                    }
                },
                AudioDeviceRole: {
                    default: {}
                }
            }
        }
    }
};
