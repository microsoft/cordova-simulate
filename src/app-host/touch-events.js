// Copyright (c) Microsoft Corporation. All rights reserved.
// Based in part on code from Apache Ripple, https://github.com/apache/incubator-ripple

var utils = require('utils');

var _lastMouseEvent,
    _isMouseDown;

// NOTE: missing view, detail, touches, targetTouches, scale and rotation
function _createTouchEvent(type, canBubble, cancelable, eventData) {
    var touchEvent = window.document.createEvent('Event');
    touchEvent.initEvent(type, canBubble, cancelable);
    utils.mixin(eventData, touchEvent);

    return touchEvent;
}

function _simulateTouchEvent(type, mouseevent) {
    if (_lastMouseEvent &&
            mouseevent.type === _lastMouseEvent.type &&
            mouseevent.pageX === _lastMouseEvent.pageX &&
            mouseevent.pageY === _lastMouseEvent.pageY) {
        return;
    }

    _lastMouseEvent = mouseevent;

    var touchObj = {
        clientX: mouseevent.pageX,
        clientY: mouseevent.pageY,
        pageX: mouseevent.pageX,
        pageY: mouseevent.pageY,
        screenX: mouseevent.pageX,
        screenY: mouseevent.pageY,
        target: mouseevent.target,
        identifier: ''
    };

    var eventData = {
        altKey: mouseevent.altKey,
        ctrlKey: mouseevent.ctrlKey,
        shiftKey: mouseevent.shiftKey,
        metaKey: mouseevent.metaKey,
        changedTouches: [touchObj],
        targetTouches: type === 'touchend' ? [] : [touchObj],
        touches: type === 'touchend' ? [] : [touchObj]
    };

    utils.mixin(touchObj, eventData);

    var itemFn = function (index) {
        return this[index];
    };

    eventData.touches.item = itemFn;
    eventData.changedTouches.item = itemFn;
    eventData.targetTouches.item = itemFn;

    var simulatedEvent = _createTouchEvent(type, true, true, eventData);
    mouseevent.target.dispatchEvent(simulatedEvent);

    if (typeof mouseevent.target['on' + type] === 'function') {
        mouseevent.target['on' + type].apply(mouseevent.target, [simulatedEvent]);
    }
}

function init() {
    window.document.addEventListener('mousedown', function (event) {
        _isMouseDown = true;
        _simulateTouchEvent('touchstart', event);
    }, true);

    window.document.addEventListener('mousemove', function (event) {
        if (_isMouseDown) {
            _simulateTouchEvent('touchmove', event);
        }
    }, true);

    window.document.addEventListener('mouseup', function (event) {
        _isMouseDown = false;
        _simulateTouchEvent('touchend', event);
    }, true);

    window.Node.prototype.ontouchstart = null;
    window.Node.prototype.ontouchend = null;
    window.Node.prototype.ontouchmove = null;
}

module.exports.init = init;
