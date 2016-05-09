// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (message) {

    var network = require('./network');

    function getConnectionInfo(success, fail) {
        if (typeof success === 'function') {
            network.successCallback = success;
            network.sendUpdate();
        }
    }

    return {
        'NetworkStatus': {
            'getConnectionInfo': function (success, fail, args) {
                getConnectionInfo(success);
            }
        }
    };
};
