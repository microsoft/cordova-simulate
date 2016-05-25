// Copyright (c) Microsoft Corporation. All rights reserved.

var Q = require('q');

// Plugin communications layer. Two types of communication are supported:
// 1. Messages - when emitted, any local handlers are notified, and it is also sent across to web sockets connection
//    where any remote handlers are notified. There can be any number of local and/or remote handlers. There is no
//    opportunity to respond.
// 2. Methods - calls across the web socket connection where there can be a single handler that can return a single
//    value or error value.

function Messages(pluginId, socket) {
    this.pluginId = pluginId;
    this.socket = socket;
    this.messages = {};
    this.methods = {};

    var that = this;
    socket.on('plugin-message', function (data) {
        if (data.pluginId === pluginId) {
            notify.call(that, that.messages, data.message, data.data);
        }
    });
    socket.on('plugin-method', function (data, callback) {
        if (data.pluginId === pluginId) {
            var handler = that.methods && that.methods[data.method];
            if (handler) {
                var args = data.args;
                args.push(callback);
                handler.apply(this, data.args);
            }
        }
    });
}

Messages._globalMessages = {};

function notify(messagesObj, message, data) {
    // Notifies local listeners of a message
    var handlers = messagesObj && messagesObj[message];
    if (handlers) {
        handlers.forEach(function (handler) {
            handler.call(this, message, data);
        });
    }
}

Messages.prototype = {
    // Call and register for methods

    /**
     * @desc Calls the specified method, with any number of parameters. Return a promise.
     * @param method
     */
    call: function (method) {
        var d = Q.defer();
        this.socket.emit('plugin-method', {
            pluginId: this.pluginId,
            method: method,
            args: Array.prototype.slice.call(arguments, 1)
        }, function (err, result) {
            if (err) {
                d.reject(err);
            } else {
                d.resolve(result);
            }
        });
        return d.promise;
    },

    register: function(method, handler) {
        // Can only ever have one handler for a method. Cancel by calling with handler null or undefined.
        this.methods[method] = handler;
        return this;
    },

    // Emit and handle messages
    emit: function (message, data, isGlobal) {
        // Pass the message across the socket
        var eventName,
            messagesObj;

        if (isGlobal) {
            eventName = 'global-plugin-message';
            messagesObj = Messages._globalMessages;
        } else {
            eventName = 'plugin-message';
            messagesObj = this.messages;
        }

        this.socket.emit(eventName, {
            pluginId: this.pluginId,
            message: message,
            data: data
        });

        // Notify any local listeners
        notify.call(this, messagesObj, message, data);
    },
    
    // Emit messages destined to external debug-hosts
    emitDebug: function(message, data) {
        this.socket.emit('debug-message', {
            pluginId: this.pluginId,
            message: message,
            data: data
        });
    },

    on: function (message, handler, isGlobal) {
        var messagesObj = (!isGlobal) ? this.messages : Messages._globalMessages;

        if (!messagesObj[message]) {
            messagesObj[message] = [handler];
        } else {
            messagesObj[message].push(handler);
        }
        return this;
    },

    off: function (message, handler) {
        var handlers = this.messages[message];
        if (!handlers) {
            // try on the global messages handlers
            handlers = Messages._globalMessages[message];
            if (!handlers) {
                return this;
            }
        }

        var pos = handlers.indexOf(handler);
        while (pos > -1) {
            handlers.splice(pos, 1);
            pos = handlers.indexOf(handler);
        }
    }
};

module.exports = Messages;
