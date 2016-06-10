// Copyright (c) Microsoft Corporation. All rights reserved.
// Based in part on code from Apache Ripple (https://github.com/apache/incubator-ripple)

module.exports = function (messages) {
    var geo = require('./geo-model'),
        utils = require('utils'),
        PositionError = require('./PositionError'),
        _watches = {};

    function _getCurrentPosition(win, fail) {
        var delay = (geo.delay || 0) * 1000;
        window.setTimeout(function () {
            if (geo.timeout) {
                if (fail) {
                    fail(new PositionError(PositionError.TIMEOUT, 'Position retrieval timed out.'));
                }
            } else {
                win(geo.getPositionInfo())
            }
        }, delay);
    }

    messages.on('position-info-updated', function (message, pi) {
        utils.forEach(_watches, function (watch) {
            try {
                _getCurrentPosition(watch.win, watch.fail);
            } catch (e) {
                console.log(e);
            }
        });
    });

    return {
        Geolocation: {
            getLocation: function (success, error) {
                _getCurrentPosition(success, error);
            },
            addWatch: function (success, error, args) {
                _watches[args[0]] = {
                    win: success,
                    fail: error
                };
                _getCurrentPosition(success, error);
            },
            clearWatch: function (success, error, args) {
                delete _watches[args[0]];
                if (success && typeof (success) === 'function') {
                    success();
                }
            }
        }
    };
};
