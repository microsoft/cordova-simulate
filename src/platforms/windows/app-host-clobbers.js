// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    // Сlobbing WinJS.Application.addEventListener
    // for proper cordova-plugin-test-framework initialization
    // on Windows platform
    WinJS: {
        Application: {
            addEventListener: function () {}
        }
    }
};
