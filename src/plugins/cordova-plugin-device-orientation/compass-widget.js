// Copyright (c) Microsoft Corporation. All rights reserved.

var navigationUtils = require('utils').navHelper();

var COMPASS_NEEDLE = {
    SHADOW_TRANSLATE: 'translate(4,4)',
    LUMINOSITY: {
        MIN: 30,
        MAX: 45
    },
    RED: {
        HUE: '0',
        SATURATION: '100%'
    },
    BLUE: {
        HUE: '214',
        SATURATION: '53%'
    }
};

/**
 * @param {object=} options
 * @constructor
 */
function CompassWidget(options) {
    options = options || {};

    var container = options.container || document.body;
    this._svgElement = container.querySelector('svg');
    checkPolyfillUseElements(this._svgElement);

    this._compassFaceElement = this._svgElement.querySelector('#compass-face');
    this._needleElement = this._svgElement.querySelector('#needle');
    this._needleShadowElement = this._svgElement.querySelector('#needle-shadow');

    this._onDragStartCallback = this._onDragStart.bind(this);
    this._onDraggingCallback = this._onDragging.bind(this);
    this._onDragEndCallback = this._onDragEnd.bind(this);
    this._onHeadingUpdatedCallback = null;
    this._sendUITelemetry = null;

    this._svgElement.addEventListener('mousedown', this._onDragStartCallback);

    this._svgElement.addEventListener('click', function (event) {
        this._updateHeadingToPosition(event.clientX, event.clientY);

        if (this._sendUITelemetry) {
            this._sendUITelemetry('compass-widget');
        }
    }.bind(this));

    this._heading = {
        value: 0,
        direction: navigationUtils.getDirection(0)
    };

    if (typeof options.headingUpdatedCallback === 'function') {
        this._onHeadingUpdatedCallback = options.headingUpdatedCallback;
    }

    if (typeof options.sendUITelemetry === 'function') {
        this._sendUITelemetry = options.sendUITelemetry;
    }
}

/**
 * Set the heading value, update the rotation and notify that it has changed.
 * @param {number} value
 */
CompassWidget.prototype.updateHeading = function (value) {
    this.setHeading(value);
    this._notifyHeadingUpdated();
};

/**
 * Get the current heading.
 * @return {object}
 */
CompassWidget.prototype.heading = function () {
    return this._heading;
};

/**
 * Set the heading value and update the rotation.
 * @param {number} value Heading value in degrees.
 */
CompassWidget.prototype.setHeading = function (value) {
    if (this._heading.value === value) {
        return;
    }

    this._heading.value = value;
    this._heading.direction = navigationUtils.getDirection(value);

    var rotationAngle = (value !== 0) ? 360 - value : value;
    this._updateRotation(rotationAngle);
};

/**
 * Update the heading to the given position in coordinates.
 * @param {number} x
 * @param {number} y
 * @private
 */
CompassWidget.prototype._updateHeadingToPosition = function (x, y) {
    var rect = this._svgElement.getBoundingClientRect();
    var centerX = (rect.left + rect.right) / 2;
    var centerY = (rect.top + rect.bottom) / 2;

    var rotationAngle = parseInt(Math.atan2(x - centerX, -(y - centerY)) * (180 / Math.PI));
    if (rotationAngle < 0) {
        rotationAngle = 360 + rotationAngle;
    }
    this.setHeading((rotationAngle !== 0) ? 360 - rotationAngle : rotationAngle);
    this._notifyHeadingUpdated();
};

/**
 * Rotate the canvas to the given angle in degrees.
 * @param {number} rotationAngle Angle in degrees.
 * @private
 */
CompassWidget.prototype._updateRotation = function (rotationAngle) {
    var transform = 'rotate(' + rotationAngle + ', 100, 100)';
    this._compassFaceElement.setAttribute('transform', transform);
    this._needleElement.setAttribute('transform', transform);
    this._needleShadowElement.setAttribute('transform', COMPASS_NEEDLE.SHADOW_TRANSLATE + ' ' + transform);

    // Determine color of needle components
    var rating = (225 - rotationAngle) / 180;
    if (rating < 0) {
        rating = -rating;
    }
    if (rating > 1) {
        rating = 2 - rating;
    }

    var luminosityRange = COMPASS_NEEDLE.LUMINOSITY.MAX - COMPASS_NEEDLE.LUMINOSITY.MIN;
    var lum1 = '' + (COMPASS_NEEDLE.LUMINOSITY.MIN + luminosityRange * rating) + '%';
    var lum2 = '' + (COMPASS_NEEDLE.LUMINOSITY.MAX - luminosityRange * rating) + '%';

    this._applyColor('.red-1', COMPASS_NEEDLE.RED.HUE + ',' + COMPASS_NEEDLE.RED.SATURATION + ',' + lum1);
    this._applyColor('.red-2', COMPASS_NEEDLE.RED.HUE + ',' + COMPASS_NEEDLE.RED.SATURATION + ',' + lum2);
    this._applyColor('.blue-1', COMPASS_NEEDLE.BLUE.HUE + ',' + COMPASS_NEEDLE.BLUE.SATURATION + ',' + lum1);
    this._applyColor('.blue-2', COMPASS_NEEDLE.BLUE.HUE + ',' + COMPASS_NEEDLE.BLUE.SATURATION + ',' + lum2);
};

/**
 * Applies an HSL fill color to any elements that match the provided selector. Used to adjust the luminosity of
 * components of the needle as the compass rotates.
 * @param {string} selector
 * @param {string} color
 * @private
 */
CompassWidget.prototype._applyColor = function (selector, color) {
    Array.prototype.forEach.call(this._svgElement.querySelectorAll(selector), function (targetElement) {
        targetElement.setAttribute('fill', 'hsl(' + color + ')');
    });
};

/**
 * @private
 */
CompassWidget.prototype._notifyHeadingUpdated = function () {
    if (this._onHeadingUpdatedCallback) {
        this._onHeadingUpdatedCallback(this._heading);
    }
};

/**
 * @private
 */
CompassWidget.prototype._onDragStart = function (event) {
    document.addEventListener('mousemove', this._onDraggingCallback);
    document.addEventListener('mouseup', this._onDragEndCallback);
};

/**
 * @private
 */
CompassWidget.prototype._onDragging = function (event) {
    this._updateHeadingToPosition(event.clientX, event.clientY);
};

/**
 * @private
 */
CompassWidget.prototype._onDragEnd = function (event) {
    document.removeEventListener('mousemove', this._onDraggingCallback);
    document.removeEventListener('mouseup', this._onDragEndCallback);
};

function checkPolyfillUseElements(svgElement) {
    var ie = /\bTrident\/[567]\b|\bMSIE (?:9|10)\.0\b/;
    var webkit = /\bAppleWebKit\/(\d+)\b/;
    var edge = /\bEdge\/12\.(\d+)\b/;
    if (ie.test(navigator.userAgent) || (navigator.userAgent.match(edge) || [])[1] < 10547 || (navigator.userAgent.match(webkit) || [])[1] < 537) {
        polyfillUseElements(svgElement);
    }
}

function polyfillUseElements(containerElement, svgElement) {
    svgElement = svgElement || containerElement;
    Array.prototype.forEach.call(containerElement.querySelectorAll('use'), function (useElement) {
        var parentNode = useElement.parentNode;
        var srcRef = useElement.getAttribute('xlink:href');
        var srcElement = svgElement.querySelector(srcRef);

        var newElement = srcElement.cloneNode(true);
        newElement.id = null;

        Array.prototype.forEach.call(useElement.attributes, function (attr) {
            newElement.setAttribute(attr.name, attr.value);
        });

        // The new element might have use element children that haven't been replaced yet
        polyfillUseElements(newElement, svgElement);

        parentNode.insertBefore(newElement, useElement);
        parentNode.removeChild(useElement);
    });
}

module.exports = CompassWidget;
