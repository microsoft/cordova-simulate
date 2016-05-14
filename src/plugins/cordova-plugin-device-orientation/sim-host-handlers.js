// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {

    var compass = require('./compass');

    return {
        Compass: {
            getHeading: function (success, error, options) {
               compass.getHeading(success, error, options);
            },
            stopHeading: function (success, error) {
                compass.stopHeading(success, error);
            }
        }
    };
};
