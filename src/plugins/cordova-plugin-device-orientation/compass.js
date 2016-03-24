// Copyright (c) Microsoft Corporation. All rights reserved.

var db = require('db');

var constants = {
    HEADING_KEY: 'device-orientation-heading-key'
};

var compass = {
    heading: null,

    initialize: function () {
        var value = db.retrieve(constants.HEADING_KEY);

        this.heading = parseFloat(value) || 0;
    },

    /**
     * @param {number} value
     */
    updateHeading: function (value) {
        this.heading = parseFloat(value);

        db.save(constants.HEADING_KEY, this.heading);
    },

    /**
     * The exec call to Compass.getHeading executes this function.
     * @param {function} success The function used to simulate the native call to CallbackContext.sendPluginResult.
     * @param {function} error The function used to simulate the native call to CallbackContext.error
     */
    getHeading: function (success, error) {
        if (typeof success === 'function') {
            success(compass.getHeadingResult());
        }
    },

    /**
     * The exec call to Compass.stopHeading executes this function.
     */
    stopHeading: function () {
        // TODO implement for iOS
    },

    getHeadingResult: function () {
        return {
            magneticHeading: this.heading,
            trueHeading: this.heading,
            headingAccuracy: 100
        };
    }
};

module.exports = compass;
