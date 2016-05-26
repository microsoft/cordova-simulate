// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function(messages) {
    messages.register('cordova-version', function (callback) {
        if (window.cordova) {
            callback(null, window.cordova.version);
        } else {
            callback(null, 'You must have cordova.js included in your projects, to be able to get cordova version');
        }
    });
};
