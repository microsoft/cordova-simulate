// Copyright (c) Microsoft Corporation. All rights reserved.

var jQuery = require('jquery.min.js');
var Q = require('q');

module.exports = function (messages) {
    // indicates whether vibration was cancelled
    var vibrationCanceled = false;

    // represents index of the vibration pattern array 
    var currentVibrationWithPatternIndex;

    // indicates whether we will need to stop vibration effect or not
    var currentVibrationNum = 0;

    messages.register('vibrate', function (event, callback) {
        if (!window.navigator && !window.navigator.vibrate) {
            callback('navigator.vibrate is not defined');
        }

        var ms = parseInt(event, 10);
        var seconds = ms/1000;
        currentVibrationNum++;
        vibrate(ms);
        console.log('vibrating for ' + seconds + ' second(s)');
        callback();
    });

    messages.register('vibrateWithPattern', function (event, callback) {
        if (!window.navigator && !window.navigator.vibrate) {
            callback('navigator.vibrate is not defined');
            return;
        }

        var pattern = event[0];
        currentVibrationWithPatternIndex = 0;
        console.log('vibrating with pattern ' + pattern);
        currentVibrationNum++;
        vibrateWithPattern(pattern, currentVibrationNum);
        console.log(currentVibrationNum);
        callback();
    });

    messages.register('cancelVibration', function (event, callback) {
        if (!window.navigator && !window.navigator.vibrate) {
            callback('navigator.vibrate is not defined');
            return;
        }

        // cancelVibration is not supported on ios
        if (window.cordova && window.cordova.platformId === 'ios') {
            callback('Not supported on iOS');
            throw new Error('Not supported on iOS');
        }

        // to stop every other vibration
        currentVibrationNum++;

        // pass 0 to cancel vibration
        vibrate(0);
        vibrationCanceled = true;
        console.log('canceling vibration');
        callback();
    });

    function vibrate (milliseconds, placeholderNum) {
        // indicating whether we will need to stop vibration effect or not
        var knownVibrationCallsCount = placeholderNum;

        var deferred = Q.defer();

        var body = jQuery('body'),
            x, times;

        // if this call is cancelVibration - immediately stop vibration and return
        if (milliseconds === 0) {
            body.css({position: '', left: '', top: ''});
            return Q();
        }

        // in the case we calling vibrateWithPattern after cancelling vibration
        vibrationCanceled = false;

        times = Math.floor(milliseconds / 100);

        body.css({position: 'fixed'});

        for (x = 1; x <= times; x++) {
            body.animate({ left: -10 }, 5, function () { checkForVibration(deferred, body); })
                .animate({ left: 0 }, 1)
                .animate({ left: 10 }, 5)
                .animate({ left: 0 }, 1)
                .animate({ top: -10 }, 5)
                .animate({ top: 0 }, 1)
                .animate({ top: 10 }, 5)
                .animate({ top: 0 }, 1);

            // stop vibrating in the end of vibration time if there is no more vibrations
            if (x >= times) {
                body.animate(
                    {top: 0},
                    1,
                    function () {
                        // if there are another vibrations that started right after vibration call,
                        // we don't need to stop vibration effect by setting position to nothing
                        if (knownVibrationCallsCount === currentVibrationNum) {
                            vibrate(0);
                        }
                        deferred.resolve();
                    });
            }
        }

        return deferred.promise;
    }

    // if vibration is cancelled, we need to set body position to nothing in the case to stop vibration effect
    function checkForVibration (deferred, element) {
        if (vibrationCanceled) {
            vibrationCanceled = false;
            element.css({position: '', left: '', top: ''});
            deferred.reject();
        }
    }

    function vibrateWithPattern (pattern, placeholderNum) {
        // checking if another vibrate with pattern call invoked
        if (currentVibrationNum != placeholderNum) {
            console.log('cancelling vibration with pattern');
            return Q();
        }

        var milliseconds = pattern[currentVibrationWithPatternIndex];
        if (milliseconds) {
            if (currentVibrationWithPatternIndex % 2 === 0) {
                console.log('vibrating...' + milliseconds);
                currentVibrationWithPatternIndex++;
                return vibrate(milliseconds, placeholderNum)
                    .then(function () { 
                        return vibrateWithPattern(pattern, placeholderNum);
                    });
            } else {
                console.log('delaying...' + milliseconds);
                currentVibrationWithPatternIndex++;
                return Q()
                    .delay(milliseconds)
                    .then(function () { 
                        return vibrateWithPattern(pattern, placeholderNum);
                    });
            }
        }
    }
};
