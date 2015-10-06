// Copyright (c) Microsoft Corporation. All rights reserved.
// Based on Apache Cordova geolocation plugin's PositionError implementation.
// See https://github.com/apache/cordova-plugin-geolocation/blob/master/www/PositionError.js

/**
 * Position error object
 *
 * @constructor
 * @param code
 * @param message
 */
var PositionError = function(code, message) {
    this.code = code || null;
    this.message = message || '';
};

PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;

module.exports = PositionError;
