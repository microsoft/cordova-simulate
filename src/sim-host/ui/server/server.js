// Copyright (c) Microsoft Corporation. All rights reserved.

var path = require('path'),
    replaceStream = require('replacestream'),
    send = require('send-transform');

var BROWSER_REPLACE_MAX_MATCH_LENGTH = 1024;
var BROWSER_REPLACE_OPTIONS = {maxMatchLen: BROWSER_REPLACE_MAX_MATCH_LENGTH};

module.exports.attach = function (app, dirs, hostRoot) {
    app.get('/simulator/sim-host.css', function (request, response) {
        var userAgent = request.headers['user-agent'];
        send(request, path.resolve(hostRoot['sim-host'], 'sim-host.css'), {
            transform: getTransform(userAgent)
        }).pipe(response);
    });
};

function getTransform(userAgent) {
    if (isChrome(userAgent)) {
        // If target browser is Chrome, remove any sections marked as not for Chrome.
        return function (stream) {
            return stream.pipe(replaceStream(/\/\* BEGIN !CHROME \*\/[\s\S]*\/\* END !CHROME \*\//gm, '', BROWSER_REPLACE_OPTIONS));
        };
    }

    // If target browser is not Chrome, remove shadow dom stuff and any sections marked as for Chrome.
    return function (stream) {
        return stream
            .pipe(replaceStream('> ::content >', '>'))
            .pipe(replaceStream(/\^|\/shadow\/|\/shadow-deep\/|::shadow|\/deep\/|::content|>>>/g, ' '))
            .pipe(replaceStream(/\/\* BEGIN CHROME \*\/[\s\S]*\/\* END CHROME \*\//gm, '', BROWSER_REPLACE_OPTIONS));
    };
}

function isChrome(userAgent) {
    return userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edge/') === -1;
}