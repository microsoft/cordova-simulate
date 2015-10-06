// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    // This variable is required on Windows platform so that plugin works
    Windows: {
        ApplicationModel: {
            Contacts: {}
        }
    },
    WinJS: {
        Utilities: {
            // While simulating Windows platform, we don't currently provide
            // a way to specify Table/PC vs Phone simulation so we always
            // retun false here; this may be changed in the future.
            isPhone: false
        }
    }
};
