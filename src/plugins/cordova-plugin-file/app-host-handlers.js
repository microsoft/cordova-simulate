// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {
    var isWebkit = window.webkitRequestFileSystem && window.webkitResolveLocalFileSystemURL;

    return isWebkit ? require('./app-host-webkit-handlers') : require('./app-host-non-webkit-handlers');
};
