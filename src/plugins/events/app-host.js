// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function(messages) {
    messages.register('event', function (event, callback) {
        if (!window.cordova) {
            callback(null, 'You must have cordova.js included in your projects, to be able to trigger events');
        } else {
            try {
                window.cordova.fireDocumentEvent(event);
                callback(null, event);
            } catch (e) {
                callback(e);
            }
        }
    });
};
