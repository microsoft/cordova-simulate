// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function () {
    var Browser = require('./inapp-browser'),
        instance;

    function execute(fnName) {
        if (!instance) {
            return;
        }

        var fn = instance[fnName],
            args;

        if (Object.keys(arguments).length > 1) {
            // remove the first element since it is the "fnName" parameter
            Array.prototype.shift.apply(arguments);
            args = arguments;
        }

        return fn.apply(instance, args);
    }

    return {
        'InAppBrowser': {
            'open': function (success, fail, args) {
                instance = Browser.create(success, fail, args);
            },
            'show': function () {
                execute('show');
            },
            'close': function () {
                execute('close');
                instance = null;
            },
            'injectScriptCode': function (success, fail, args) {
                execute('injectScriptCode', success, args);
            },
            'injectScriptFile': function (success, fail, args) {
                execute('injectScriptFile', success, args);
            },
            'injectStyleCode': function (success, fail, args) {
                execute('injectStyleCode', success, args);
            },
            'injectStyleFile': function (success, fail, args) {
                execute('injectStyleFile', success, args);
            }
        }
    };
};
