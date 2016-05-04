// Copyright (c) Microsoft Corporation. All rights reserved.

var path = require('path'),
    replaceStream = require('replacestream'),
    send = require('send');

module.exports.attach = function (app, dirs) {
    app.get('/simulator/sim-host.css', function (request, response, next) {
        var userAgent = request.headers['user-agent'];
        if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edge/') === -1) {
            next();
        } else {
            // If target browser isn't Chrome (user agent contains 'Chrome', but isn't 'Edge'), remove shadow dom stuff from
            // the CSS file. Also remove any sections marked as Chrome specific.
            send(request, path.resolve(dirs.hostRoot['sim-host'], 'sim-host.css'), {
                transform: function (stream) {
                    return stream
                        .pipe(replaceStream('> ::content >', '>'))
                        .pipe(replaceStream(/\^|\/shadow\/|\/shadow-deep\/|::shadow|\/deep\/|::content|>>>/g, ' '))
                        .pipe(replaceStream(/\/\* BEGIN CHROME ONLY \*\/[\s\S]*\/\* END CHROME ONLY \*\//gm, ''));
                }
            }).pipe(response);
        }
    });
};
