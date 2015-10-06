// Copyright (c) Microsoft Corporation. All rights reserved.
// Based on Apache Cordova geolocation plugin's Position implementation.
// See https://github.com/apache/cordova-plugin-geolocation/blob/master/www/Position.js

var Coordinates = require('./Coordinates');

var Position = function(coords, timestamp) {
    if (coords) {
        this.coords = new Coordinates(coords.latitude, coords.longitude, coords.altitude, coords.accuracy, coords.heading, coords.velocity, coords.altitudeAccuracy);
    } else {
        this.coords = new Coordinates();
    }
    this.timestamp = (timestamp !== undefined) ? timestamp : new Date();
};

module.exports = Position;
