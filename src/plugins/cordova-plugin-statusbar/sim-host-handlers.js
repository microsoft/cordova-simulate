// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    'StatusBar': {
        '_ready': function (successCallback) {
            // Report to the app that the status bar is hidden
            successCallback(false);
        }
    }
};
