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
        } else {
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
            NamedNodeMap = window.MozNamedAttrMap; // eslint-disable-line no-global-assign
        }
        /* jshint ignore:end */

        if (obj instanceof Array) {
            return obj.map(func, scope);
        } else if (obj instanceof NamedNodeMap) {
            for (i = 0; i < obj.length; i++) {
                returnVal = func.apply(scope, [obj[i], i]);
                result.push(returnVal);
            }
        } else {
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

    mixin: function (mixin, to) {
        for (var prop in mixin) {
            if (Object.hasOwnProperty.call(mixin, prop)) {
                to[prop] = mixin[prop];
            }
        }
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

    navHelper: function () {
        return {
            Directions: {
                N: 'N',
                NE: 'NE',
                E: 'E',
                SE: 'SE',
                S: 'S',
                SW: 'SW',
                W: 'W',
                NW: 'NW'
            },

            /**
             * Get the direction according to the heading value.
             * @param {number} heading A number from 0 to 359.99.
             * @return {string} direction It can be one of the following: N, NE, E, SE, S, SW, W or NW.
             */
            getDirection: function (heading) {
                if (heading > 337.5 || (heading >= 0 && heading <= 22.5)) {
                    return this.Directions.N;
                }

                if (heading > 22.5 && heading <= 67.5) {
                    return this.Directions.NE;
                }

                if (heading > 67.5 && heading <= 112.5) {
                    return this.Directions.E;
                }

                if (heading > 112.5 && heading <= 157.5) {
                    return this.Directions.SE;
                }

                if (heading > 157.5 && heading <= 202.5) {
                    return this.Directions.S;
                }

                if (heading > 202.5 && heading <= 247.5) {
                    return this.Directions.SW;
                }

                if (heading > 247.5 && heading <= 292.5) {
                    return this.Directions.W;
                }

                // heading > 292.5 && heading <= 337.5
                return this.Directions.NW;
            },

            getHeading: function (lat1, lon1, lat2, lon2) {
                var dLon  = this.rad(lon2 - lon1),
                    llat1 = this.rad(lat1),
                    llat2 = this.rad(lat2),
                    y     = Math.sin(dLon) * Math.cos(llat2),
                    x     = Math.cos(llat1) * Math.sin(llat2) - Math.sin(llat1) * Math.cos(llat2) * Math.cos(dLon);
                return (this.deg(Math.atan2(y, x)) + 360) % 360;
            },

            getDistance: function (lat1, lon1, lat2, lon2) {
                var dLat = this.rad(lat2 - lat1),
                    dLon = this.rad(lon2 - lon1),
                    a    = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.rad(lat1)) * Math.cos(this.rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2),
                    c    = 2 * Math.asin(Math.sqrt(a)),
                    d    = 6378100 * c;
                return d;
            },

            simulateTravel: function (lat, lon, hdg, dist) {
                var lat1            = this.rad(lat),
                    lon1            = this.rad(lon),
                    brng            = this.rad(hdg),
                    angularDistance = dist / 6378100,
                    lat2            = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(brng)),
                    lon2            = lon1 + Math.atan2(Math.sin(brng) * Math.sin(angularDistance) * Math.cos(lat1), Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2));
                lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI; // Normalize to -180..+180

                return {
                    latitude: this.deg(lat2),
                    longitude: this.deg(lon2)
                };
            },

            deg: function (num) {
                return num * 180 / Math.PI;
            },

            rad: function (num) {
                return num * Math.PI / 180;
            }
        };
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
    },

    parseUrl: function (url) {
        var a = document.createElement('a');

        a.href = url;

        return {
            href: a.href,
            host: a.host,
            origin: a.origin,
            port: a.port,
            protocol: a.protocol,
            search: a.search
        };
    },

    isSameOriginRequest: function (url) {
        url = this.parseUrl(url);

        if (url.port !== location.port) {
            return false;
        }

        var sameOrigin = url.href.match(location.origin.replace(/www\./, '')) ||
            !url.href.match(/^https?:\/\/|^file:\/\//);

        return !!sameOrigin;
    },

    isNumber: function (value) {
        var type = typeof value;

        return (type === 'number' || type === 'string') && !isNaN(value - parseFloat(value));
    }
};

function createUUIDPart(length) {
    var uuidpart = '';
    for (var i = 0; i < length; i++) {
        var uuidchar = parseInt((Math.random() * 256), 10).toString(16);
        if (uuidchar.length == 1) {
            uuidchar = '0' + uuidchar;
        }
        uuidpart += uuidchar;
    }
    return uuidpart;
}
