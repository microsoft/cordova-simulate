// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function () {
    var IframeBrowser = require('./inapp-browser').IframeBrowser,
        SystemBrowser = require('./inapp-browser').SystemBrowser,
        instance;

    return {
        'InAppBrowser': {
            'open': function (success, fail, args) {
                // args[0]: url, args[1]: target, args[2]: options
                var Constructor;

                switch (args[1]) {
                case '_system':
                    // open in a new browser tab
                    Constructor = SystemBrowser;
                    break;
                case '_blank':
                    Constructor = IframeBrowser;
                    break;
                default:
                    // "_self" and any other option, use the same tab
                    window.location = args[0];
                    return;
                }

                instance = new Constructor(args[0], args[2], success, fail);
            },
            'show': function () {
                if (instance) {
                    instance.show();
                }
            },
            'close': function () {
                if (instance) {
                    instance.close();
                }
            },
            'injectScriptCode': function (success, fail, args) {
                instance.injectScriptCode(success, args);
            },
            'injectScriptFile': function (success, fail, args) {
                instance.injectScriptFile(success, args);
            },
            'injectStyleCode': function (success, fail, args) {
                instance.injectStyleCode(success, args);
            },
            'injectStyleFile': function (success, fail, args) {
                instance.injectStyleFile(success, args);
            }
        }
    };
};
