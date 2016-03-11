// Copyright (c) Microsoft Corporation. All rights reserved.

// Connection types from Apache Cordova network-information plugin's Connection.js implementation.
// See https://github.com/apache/cordova-plugin-network-information/blob/master/www/Connection.js

var db = require('db');

var simConstants = {
    NETWORK_TYPE_KEY: 'network-key'
};

var network = {
    ConnectionTypes: {
        UNKNOWN: 'unknown',
        ETHERNET: 'ethernet',
        WIFI: 'wifi',
        CELL_2G: '2g',
        CELL_3G: '3g',
        CELL_4G: '4g',
        CELL: 'cellular',
        NONE: 'none'
    },

    _defaultConnectionType: this.ConnectionTypes.CELL_4G,

    connectionType: null,

    successCallback: null,

    initialize: function () {
        this.connectionType = db.retrieve(simConstants.NETWORK_TYPE_KEY) || this._defaultConnectionType;
    },

    /**
     * @param {string} type
     */
    updateNetworkType: function (type) {
        this.connectionType = type;

        db.save(simConstants.NETWORK_TYPE_KEY, this.connectionType);

        this.sendUpdate();
    },

    sendUpdate: function () {
        if (typeof this.successCallback === 'function') {
            var value = this.ConnectionTypes[this.connectionType];
            this.successCallback(value);
        }
    }
};

module.exports = network;
