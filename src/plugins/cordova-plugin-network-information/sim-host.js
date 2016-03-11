// Copyright (c) Microsoft Corporation. All rights reserved.

var network = require('./network');

network.initialize();

function initialize() {
    var connectionTypeList = document.getElementById('connection-list'),
        type,
        option;

    for (type in network.ConnectionTypes) {
        if (network.ConnectionTypes.hasOwnProperty(type)) {
            option = document.createElement('option');
            option.appendChild(document.createTextNode(type));
            option.value = type;

            if (type === network.connectionType) {
                option.selected = true;
            }

            connectionTypeList.appendChild(option);
        }
    }

    connectionTypeList.addEventListener('change', function () {
        network.updateNetworkType(connectionTypeList.value);
    });
}

module.exports = {
    initialize: initialize
};
