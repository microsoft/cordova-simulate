// Copyright (c) Microsoft Corporation. All rights reserved.
// Based in part on code from Apache Ripple, https://github.com/apache/incubator-ripple

var db = require('db'),
    exception = require('exception'),
    utils = require('utils'),
    _positionInfo = {
        'latitude': 43.465187,
        'longitude': -80.522372,
        'altitude': 100,
        'accuracy': 150,
        'altitudeAccuracy': 80,
        'heading': 0,
        'speed': 0
    };

var messages;

function _serialize(settings) {
    var tempSettings = utils.copy(settings);
    tempSettings.position.timeStamp = 'new Date(' + tempSettings.position.timeStamp.getTime() + ')';
    return tempSettings;
}

function _validatePositionInfo(pInfo) {
    return (pInfo && !(isNaN(pInfo.latitude) ||
    isNaN(pInfo.longitude) ||
    isNaN(pInfo.altitude) ||
    isNaN(pInfo.accuracy) ||
    isNaN(pInfo.altitudeAccuracy) ||
    isNaN(pInfo.heading) ||
    isNaN(pInfo.speed))) ? true : false;
}

var self = {
    initialize: function (msgs) {
        messages = msgs;

        var settings = db.retrieveObject('geosettings');
        if (settings) {
            utils.forEach(_positionInfo, function (value, key) {
                _positionInfo[key] = parseFloat(settings.position[key] || value);
            });

            self.timeout = settings.timeout;
            self.delay = settings.delay || 0;
        }
    },

    getPositionInfo: function () {
        var pi = utils.copy(_positionInfo);
        pi.timeStamp = new Date();

        return pi;
    },

    updatePositionInfo: function (newPositionInfo, delay, timeout) {
        if (!_validatePositionInfo(newPositionInfo)) {
            exception.raise(updatePositionInfo, exception.types.Geo, 'invalid positionInfo object');
        }

        _positionInfo = utils.copy(newPositionInfo);
        _positionInfo.timeStamp = new Date();

        self.delay = delay || 0;
        self.timeout = timeout;

        db.saveObject('geosettings', _serialize({
            position: _positionInfo,
            delay: self.delay,
            timeout: self.timeout
        }));

        if (!messages) {
            throw 'geo-model has not been initialized';
        }

        messages.emit('position-info-updated', _positionInfo);
    },

    timeout: false,
    delay: 0,
    map: {}
};


module.exports = self;
