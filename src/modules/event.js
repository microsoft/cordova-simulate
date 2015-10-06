// Copyright (c) Microsoft Corporation. All rights reserved.
// Based in part on code from Apache Ripple, https://github.com/apache/incubator-ripple

var utils = require('utils'),
    exception = require('exception'),
    _listeners = {};

function _on(eventType, listener, scope, once) {
    if (!eventType) {
        throw "eventType must be truthy";
    }
    _listeners[eventType] = _listeners[eventType] || [];
    _listeners[eventType].push({
        func: listener,
        scope: scope,
        once: !!once
    });
}

function _trigger(listener, args, sync) {
    try {
        if (sync) {
            listener.func.apply(listener.scope, args);
        }
        else {
            setTimeout(function () {
                listener.func.apply(listener.scope, args);
            }, 1);
        }
    }
    catch (e) {
        exception.handle(e);
    }
}

module.exports = {
    on: function (eventType, listener, scope) {
        _on(eventType, listener, scope, false);
    },

    once: function (eventType, listener, scope) {
        _on(eventType, listener, scope, true);
    },

    trigger: function (eventType, args, sync) {
        args = args || [];
        sync = sync || false;

        var listeners = _listeners[eventType];

        if (listeners) {
            listeners.forEach(function (listener) {
                _trigger(listener, args, sync);
            });

            _listeners[eventType] = listeners.filter(function (listener) {
                return !listener.once;
            });
        }
    },

    eventHasSubscriber: function (eventType) {
        return !!_listeners[eventType];
    },

    getEventSubscribers: function (eventType) {
        return utils.copy(_listeners[eventType]) || [];
    },

    clear: function (eventType) {
        if (eventType) {
            delete _listeners[eventType];
        }
    }
};
