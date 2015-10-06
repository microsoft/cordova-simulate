// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    // This is required for device-motion tests for windows platform.
    Windows: {
        Devices: {
            Sensors: {
                Accelerometer: {
                    getDefault: function () { return true; }
                }
            }
        }
    }
};
