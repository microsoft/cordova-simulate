// Copyright (c) Microsoft Corporation. All rights reserved.
// Based in part on code from Apache Ripple, https://github.com/apache/incubator-ripple

var utils = require('utils');

var init = function () {
    var _XMLHttpRequest = XMLHttpRequest;
    window.XMLHttpRequest = function () {
        var xhr = new _XMLHttpRequest(),
            origMethods = {
                setRequestHeader: xhr.setRequestHeader,
                open: xhr.open
            };

        xhr.open = function (method, url) {
            var sameOrigin = utils.isSameOriginRequest(url);

            if (!sameOrigin) {
                url = '/xhr_proxy?rurl=' + escape(url);
            }

            origMethods.open.apply(xhr, Array.prototype.slice.call(arguments));
        };

        return xhr;
    };
};

module.exports = {
    init: init
};
