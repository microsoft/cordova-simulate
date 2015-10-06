// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    // This variable is required on Windows so that plugin works
    Windows: {
        Storage: {
            ApplicationData: {
                current: {}
            },
            CreationCollisionOption: {
                generateUniqueName: function () {}
            },
            FileIO: {},
            Pickers: {
                PickerLocationId: {}
            }
        },
        Media: {
            Capture: {
                MediaStreamType: {}
            }
        },
        UI: {
            WebUI: {
                WebUIApplication: {}
            }
        }
    }
};
