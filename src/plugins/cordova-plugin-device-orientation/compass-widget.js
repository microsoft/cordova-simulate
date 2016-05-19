// Copyright (c) Microsoft Corporation. All rights reserved.

var navigationUtils = require('utils').navHelper();

/**
 * @param {object=} options
 * @constructor
 */
function CompassWidget(options) {
    options = options || {};

    this._container = options.container || document.body;

    this._canvasElement = document.createElement('canvas');
    this._indicatorCanvasElement = document.createElement('canvas');

    this._container.appendChild(this._indicatorCanvasElement);
    this._container.appendChild(this._canvasElement);

    this._context = this._canvasElement.getContext('2d');
    this._diameter = (typeof options.diameter === 'number') ? options.diameter : CompassWidget.Defaults.DIAMETER;

    this._wrapperSize = 25;
    this._compassBorderSize = 15;

    this._canvasElement.style.position = 'absolute';
    this._canvasElement.style.cursor = 'pointer';
    this._canvasElement.style.top = '12px';
    this._canvasElement.style.left = '12px';
    this._canvasElement.width = this._diameter;
    this._canvasElement.height = this._diameter;

    this._center = {
        x: this._diameter / 2,
        y: this._diameter / 2
    };

    this._pointer = {
        width: 30,
        height: this._diameter - this._compassBorderSize * 2,
        offset: this._compassBorderSize
    };

    this._onDragStartCallback = this._onDragStart.bind(this);
    this._onDraggingCallback = this._onDragging.bind(this);
    this._onDragEndCallback = this._onDragEnd.bind(this);
    this._onHeadingUpdatedCallback = null;

    this._canvasElement.addEventListener('mousedown', this._onDragStartCallback);

    this._canvasElement.addEventListener('click', function (event) {
        this._updateHeadingToPosition(event.clientX, event.clientY);
    }.bind(this));

    this._heading = {
        value: 0,
        direction: navigationUtils.getDirection(this.value)
    };

    if (typeof options.headingUpdatedCallback === 'function') {
        this._onHeadingUpdatedCallback = options.headingUpdatedCallback;
    }
}

CompassWidget.Defaults = {
    DIAMETER: 160
};

CompassWidget.prototype.initialize = function (headingValue) {
    var indicatorContext = this._indicatorCanvasElement.getContext('2d'),
        diameter = this._diameter + this._wrapperSize,
        x = this._center.x + this._wrapperSize / 2,
        y = this._center.y + this._wrapperSize / 2;

    this._indicatorCanvasElement.style.position = 'absolute';
    this._indicatorCanvasElement.width = this._diameter + this._wrapperSize;
    this._indicatorCanvasElement.height = this._diameter + this._wrapperSize;

    indicatorContext.beginPath();
    indicatorContext.arc(x, y, diameter / 2, 0, Math.PI * 2, false);
    indicatorContext.fillStyle = '#CCCCCC';
    indicatorContext.fill();

    indicatorContext.beginPath();
    indicatorContext.moveTo(x - this._wrapperSize / 3, 0);
    indicatorContext.lineTo(x, this._wrapperSize / 2);
    indicatorContext.lineTo(x + this._wrapperSize / 3, 0);
    indicatorContext.lineTo(x, 0);
    indicatorContext.fillStyle = '#DC052C';
    indicatorContext.fill();

    this._drawCompass();

    this.updateHeading(headingValue);
};

/**
 * Set the headig value, udpate the rotation and notify that it has changed.
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
 * Draw the main compass, including the pointer and the directions section.
 * @private
 */
CompassWidget.prototype._drawCompass = function () {
    this._context.beginPath();
    this._context.arc(this._center.x, this._center.y, this._diameter / 2, 0, Math.PI * 2, false);
    this._context.fillStyle = '#58B8EB';
    this._context.fill();

    this._context.beginPath();
    this._context.arc(this._center.x, this._center.y, (this._diameter / 2) - this._compassBorderSize, 0, Math.PI * 2, false);
    this._context.fillStyle = '#AFEEF9';
    this._context.fill();

    // pointer
    this._context.beginPath();
    this._context.moveTo(this._center.x, this._center.y);
    this._context.lineTo(this._center.x - this._pointer.width / 2, this._center.y);
    this._context.lineTo(this._center.x, this._pointer.offset);
    this._context.lineTo(this._center.x, this._center.y);
    this._context.fillStyle = '#FF532B';
    this._context.fill();

    this._context.beginPath();
    this._context.moveTo(this._center.x, this._center.y);
    this._context.lineTo(this._center.x + this._pointer.width / 2, this._center.y);
    this._context.lineTo(this._center.x, this._pointer.offset);
    this._context.lineTo(this._center.x, this._center.y);
    this._context.fillStyle = '#DC052C';
    this._context.fill();

    this._context.beginPath();
    this._context.moveTo(this._center.x, this._center.y);
    this._context.lineTo(this._center.x - this._pointer.width / 2, this._center.y);
    this._context.lineTo(this._center.x, this._center.y + this._pointer.height / 2);
    this._context.lineTo(this._center.x, this._center.y);
    this._context.fillStyle = '#DAE1EF';
    this._context.fill();

    this._context.beginPath();
    this._context.moveTo(this._center.x, this._center.y);
    this._context.lineTo(this._center.x + this._pointer.width / 2, this._center.y);
    this._context.lineTo(this._center.x, this._center.y + this._pointer.height / 2);
    this._context.lineTo(this._center.x, this._center.y);
    this._context.fillStyle = '#91AEDC';
    this._context.fill();

    // directions
    this._context.fillStyle = '#000000';
    this._context.font = '14px Arial';
    this._context.fillText(navigationUtils.Directions.N, this._center.x - 5, this._compassBorderSize - 3);
    this._context.fillText(navigationUtils.Directions.E, this._center.x + this._diameter / 2 - this._compassBorderSize + 3, this._center.y);
    this._context.fillText(navigationUtils.Directions.S, this._center.x - 5, this._center.y + this._diameter / 2 - 3);
    this._context.fillText(navigationUtils.Directions.W, this._center.x - this._diameter / 2 + 1, this._center.y);
};

/**
 * Update the heading to the given position in coordinates.
 * @param {number} x
 * @param {number} y
 * @private
 */
CompassWidget.prototype._updateHeadingToPosition = function (x, y) {
    var rect = this._indicatorCanvasElement.getBoundingClientRect(),
        radius = this._diameter / 2,
        top = rect.top + radius + this._compassBorderSize,
        left = rect.left + radius + this._compassBorderSize,
        rotationAngle = parseInt(Math.atan2(x - left, -(y - top)) * (180 / Math.PI));

    if (rotationAngle < 0) {
        rotationAngle = parseInt(360 + rotationAngle);
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
    var rotate = 'rotate(' + rotationAngle + 'deg)';
    this._canvasElement.style.transform = rotate;
    this._canvasElement.style.webkitTransform = rotate;
    this._canvasElement.style.MozTransform = rotate;
    this._canvasElement.style.msTransform = rotate;
    this._canvasElement.style.oTransform = rotate;
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

module.exports = CompassWidget;
