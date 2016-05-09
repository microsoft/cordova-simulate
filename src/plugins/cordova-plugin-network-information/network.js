// Copyright (c) Microsoft Corporation. All rights reserved.

// Connection types from Apache Cordova network-information plugin's Connection.js implementation.
// See https://github.com/apache/cordova-plugin-network-information/blob/master/www/Connection.js

var db = require('db');

var simConstants = {
    NETWORK_TYPE: 'network-type'
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

    connectionType: null,
    successCallback: null,

    initialize: function () {
        this.connectionType = db.retrieve(simConstants.NETWORK_TYPE) || this.ConnectionTypes.CELL_4G;
    },

    /**
     * @param {string} type
     */
    updateNetworkType: function (type) {
        this.connectionType = type;

        db.save(simConstants.NETWORK_TYPE, this.connectionType);

        this.sendUpdate();
    },

    sendUpdate: function () {
        if (typeof this.successCallback === 'function') {
            this.successCallback(this.connectionType);
        }
    }
};

module.exports = network;
