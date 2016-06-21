// Copyright 2016 Intel Corporation. All rights reserved.

var isAppHostReady = false,
    appHostReadyHandlers = [];

function whenAppHostReady(handler) {
    var idx;
    if (typeof handler !== 'function') {
        return;
    }
    idx = appHostReadyHandlers.push({'handler': handler, 'fired': false});
    if (isAppHostReady) {
        handler();
        appHostReadyHandlers[idx-1].fired = true;
    }
}

function fireAppHostReady() {
    isAppHostReady = true;
    appHostReadyHandlers.forEach(function (element) {
        if (!element.fired) {
            element.handler();
            element.fired = true;
        }
    });
}

/* Internal use function */
module.exports._fireAppHostReady    = fireAppHostReady;
/* Public API */
module.exports.whenAppHostReady     = whenAppHostReady;
