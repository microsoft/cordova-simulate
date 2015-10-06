// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {
    function handleVibration(success, fail, args) {
        var ms = args[0];
        messages.call('vibrate', ms).then(function () {
            console.log('Vibrating for ' + ms + ' milliseconds');
        }, function (err) {
            throw new Error('Vibration failed: ' + err);
        });
    }

    function handleVibrationWithPattern(success, fail, args) {
        messages.call('vibrateWithPattern', args).then(function () {
            console.log('Vibrating with pattern - ' +args);
        }, function (err) {
            throw new Error('Vibration with pattern failed: ' + err);
        });
    }

    function handleCancelVibration(success, fail, args) {
        messages.call('cancelVibration', 'cancelVibration').then(function () {
            console.log('Cancelling vibration');
        }, function (err) {
            throw new Error('Cancel vibration failed: ' + err);
        });
    }

    return {
        'Vibration': {
            'vibrate': handleVibration,
            'vibrateWithPattern': handleVibrationWithPattern,
            'cancelVibration': handleCancelVibration
        }
    };
};
