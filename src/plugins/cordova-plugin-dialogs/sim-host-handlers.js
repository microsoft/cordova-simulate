// Copyright (c) Microsoft Corporation. All rights reserved.
 
// https://github.com/apache/cordova-plugin-dialogs/

module.exports = function (messages) {
    function alert (success, fail, args) {
        messages.call('alert', args).then(function () {
            success();
        }, function (err) {
            fail(err);
        });
    }

    function confirm (success, fail, args) {
        messages.call('confirm', args).then(function (result) {
            success(result);
        }, function (err) {
            fail(err);
        });
    }

    function prompt (success, fail, args) {
        messages.call('prompt', args).then(function (result) {
            success(result);
        }, function (err) {
            fail(err);
        });
    }

    function beep (success, fail, args) {
        var times = args[0];
        messages.call('beep', times).then(function () {
            success();
        }, function (err) {
            fail(err);
        });
    }

    return {
        Notification: {
            alert: alert,
            confirm: confirm,
            prompt: prompt,
            beep: beep,
        }
    };
};
