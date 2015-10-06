// Copyright (c) Microsoft Corporation. All rights reserved.
// Based in part on code from Apache Ripple, https://github.com/apache/incubator-ripple

var self,
    exception = require('exception');

self = module.exports = {
    validateArgumentType: function (arg, argType, customExceptionType, customExceptionMessage, customExceptionObject) {
        var invalidArg = false,
            msg;

        switch (argType) {
            case 'array':
                if (!(arg instanceof Array)) {
                    invalidArg = true;
                }
                break;
            case 'date':
                if (!(arg instanceof Date)) {
                    invalidArg = true;
                }
                break;
            case 'integer':
                if (typeof arg === 'number') {
                    if (arg !== Math.floor(arg)) {
                        invalidArg = true;
                    }
                }
                else {
                    invalidArg = true;
                }
                break;
            default:
                if (typeof arg !== argType) {
                    invalidArg = true;
                }
                break;
        }

        if (invalidArg) {
            msg = customExceptionMessage + ('\n\nInvalid Argument type. argument: ' + arg + ' ==> was expected to be of type: ' + argType);
            exception.raise((customExceptionType || exception.types.ArgumentType), msg, customExceptionObject);
        }
    },

    forEach: function (obj, action, scope) {
        if (obj instanceof Array) {
            return obj.forEach(action, scope);
        }
        else {
            self.map(obj, action, scope);
        }
    },

    map: function (obj, func, scope) {
        var i,
            returnVal = null,
            result    = [];

        //MozHack for NamedNodeMap
        /* jshint ignore:start */
        if (window.MozNamedAttrMap) {
            NamedNodeMap = window.MozNamedAttrMap;
        }
        /* jshint ignore:end */

        if (obj instanceof Array) {
            return obj.map(func, scope);
        }
        else if (obj instanceof NamedNodeMap) {
            for (i = 0; i < obj.length; i++) {
                returnVal = func.apply(scope, [obj[i], i]);
                result.push(returnVal);
            }
        }
        else {
            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    returnVal = func.apply(scope, [obj[i], i]);
                    result.push(returnVal);
                }
            }
        }

        return result;
    },

    bindAutoSaveEvent: function (selector, saveCallback) {
        var oldSetTimeoutId;

        var node = document.querySelector(selector);

        if (!node) {
            console.log('AUTO SAVE: REINSTATE ONCE WE HAVE ' + selector + ' ELEMENT');
            return;
        }

        node.addEventListener('keyup', function (event) {
            if (event.keyCode !== 9) {
                clearTimeout(oldSetTimeoutId);
                oldSetTimeoutId = window.setTimeout(function () {
                    saveCallback();
                }, 500);
            }
        });
    },

    copy: function (obj) {
        var i,
            newObj = Array.isArray(obj) ? [] : {};

        if (typeof obj === 'number' ||
            typeof obj === 'string' ||
            typeof obj === 'boolean' ||
            obj === null ||
            obj === undefined) {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj);
        }

        if (obj instanceof RegExp) {
            return new RegExp(obj);
        }

        for (i in obj) {
            if (obj.hasOwnProperty(i)) {
                if (obj[i] && typeof obj[i] === 'object') {
                    if (obj[i] instanceof Date) {
                        newObj[i] = obj[i];
                    }
                    else {
                        newObj[i] = self.copy(obj[i]);
                    }
                }
                else {
                    newObj[i] = obj[i];
                }
            }
        }

        return newObj;
    },

    createUUID: function () {
        return createUUIDPart(4) + '-' +
            createUUIDPart(2) + '-' +
            createUUIDPart(2) + '-' +
            createUUIDPart(2) + '-' +
            createUUIDPart(6);
    },

    typeName: function (val) {
        return Object.prototype.toString.call(val).slice(8, -1);
    }
};

function createUUIDPart(length) {
    var uuidpart = "";
    for (var i = 0; i < length; i++) {
        var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
        if (uuidchar.length == 1) {
            uuidchar = "0" + uuidchar;
        }
        uuidpart += uuidchar;
    }
    return uuidpart;
}

