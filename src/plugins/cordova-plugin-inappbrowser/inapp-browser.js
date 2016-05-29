// Copyright (c) Microsoft Corporation. All rights reserved.

/**
 * @param {string} url
 * @param {Array} options
 * @param {function} success
 * @param {function} fail
 * @constructor
 */
function InAppBrowser(url, options, success, fail) {
    this._url = url;
    this._options = {};
    this._callbacks = {
        success: success,
        fail: fail
    };

    options = (options.trim() === '') ? [] : options.split(';');

    // prepare options object
    options.forEach(function (option) {
        var prop = option.split('='); // "theOption=value"
        this._options[prop[0]] = prop[1];
    }.bind(this));

    if (this._options.hidden !== 'yes') {
        this.show();
    }
}

/**
 * @enum
 */
InAppBrowser.Events = {
    LOAD_START: 'loadstart',
    LOAD_STOP: 'loadstop',
    LOAD_ERROR: 'loaderror',
    EXIT: 'exit'
};

InAppBrowser.prototype.show = function () {};

InAppBrowser.prototype.close = function () {};

InAppBrowser.prototype.injectScriptCode = function (callback, args) {
    console.error('InAppBrowser "injectScriptCode" simulation not supported');
};

InAppBrowser.prototype.injectScriptFile = function (callback, args) {
    console.error('InAppBrowser "injectScriptFile" simulation not supported');
};

InAppBrowser.prototype.injectStyleCode = function (callback, args) {
    console.error('InAppBrowser "injectStyleCode" simulation not supported');
};

InAppBrowser.prototype.injectStyleFile = function (callback, args) {
    console.error('InAppBrowser "injectScriptFile" simulation not supported');
};

/**
 * @param {string} eventName
 * @private
 */
InAppBrowser.prototype._success = function (eventName) {
    this._callbacks.success({
        type: eventName
    });
};

/**
 * @param {string} url
 * @param {Array} options
 * @param {function} success
 * @param {function} fail
 * @constructor
 */
function SystemBrowser(url, options, success, fail) {
    InAppBrowser.call(this, url, options, success, fail);

    this._window = null;
}

SystemBrowser.prototype = Object.create(InAppBrowser.prototype);
SystemBrowser.prototype.constructor = SystemBrowser;
SystemBrowser.prototype.parentClass = InAppBrowser.prototype;

SystemBrowser.prototype.show = function () {
    if (!this._window) {
        var modulemapper = cordova.require('cordova/modulemapper'),
            windowOpen = modulemapper.getOriginalSymbol(window, 'window.open');

        this._success(InAppBrowser.Events.LOAD_START);

        this._window = windowOpen.call(window, this._url, '_blank');
    }
};

SystemBrowser.prototype.close = function () {
    if (this._window) {
        this._window.close();
        this._window = null;

        this._success(InAppBrowser.Events.EXIT);
    }
};

/**
 * @param {string} url
 * @param {Array} options
 * @param {function} success
 * @param {function} fail
 * @constructor
 */
function IframeBrowser(url, options, success, fail) {
    this._container = null;
    this._frame = null;

    InAppBrowser.call(this, url, options, success, fail);
}

IframeBrowser.prototype = Object.create(InAppBrowser.prototype);
IframeBrowser.prototype.constructor = IframeBrowser;
IframeBrowser.prototype.parentClass = InAppBrowser.prototype;

IframeBrowser.prototype.show = function () {
    this._createFrame();

    this._frame.src = this._url;
    this._container.style.display = 'block';
};

IframeBrowser.prototype.close = function () {
    if (this._container) {
        this._container.parentNode.removeChild(this._container);
        this._container = null;
        this._frame = null;

        this._success(InAppBrowser.Events.EXIT);
    }
};

IframeBrowser.prototype.hide = function () {
    if (this._container) {
        this._container.style.display = 'none';
    }
};

IframeBrowser.prototype.injectScriptCode = function (callback, args) {
    if (this._container && this._frame) {
        var code = args[0],
            hasCallback = args[1];

        try {
            var result = this._frame.contentWindow.eval(code);
            if (hasCallback) {
                result = result || [];
                callback(result);
            }
        } catch (error) {
            console.error('Error occured while trying to inject script', error);
        }
    }
};

IframeBrowser.prototype.injectScriptFile = function (callback, args) {
    var file = args[0];
    var code = '(function () {' +
        'var head = document.getElementsByTagName("head")[0];' +
        'var script = document.createElement("script");' +
        'script.type = "text/javascript";' +
        'script.id = "inappbrowser-inject-script";' +
        'script.src = "' + file + '";' +
        'head.appendChild(script);' +
        '}());';

    args[0] = code;

    this.injectScriptCode(callback, args);
};

IframeBrowser.prototype.injectStyleCode = function (callback, args) {
    // TODO
};

IframeBrowser.prototype.injectStyleFile = function (callback, args) {
    // TODO
};

/**
 * @private
 */
IframeBrowser.prototype._createFrame = function () {
    if (!this._container) {
        this._container = document.createElement('div');
        this._frame = document.createElement('iframe');

        // container style
        var style = this._container.style;
        style.position = 'absolute';
        style.border = '0';
        style.backgroundColor = '#ffffff';
        style.width = '100%';
        style.height = '100%';
        style.zIndex = '10000';

        // iframe style
        style = this._frame.style;
        style.border = '0';
        style.width = '100%';

        if (!this._options.location || this._options.location === 'yes') {
            style.height = 'calc(100% - 35px)';

            this._container.appendChild(this._createNavigationBar());
        } else {
             style.height = '100%';
        }

        this._container.appendChild(this._frame);

        document.body.appendChild(this._container);

        this._frame.addEventListener('pageshow', this._success.bind(this, InAppBrowser.Events.LOAD_START));
        this._frame.addEventListener('load', this._success.bind(this, InAppBrowser.Events.LOAD_STOP));
        this._frame.addEventListener('error', this._success.bind(this, InAppBrowser.Events.LOAD_ERROR));
        this._frame.addEventListener('abort', this._success.bind(this, InAppBrowser.Events.LOAD_ERROR ));
    }
};

/**
 * @private
 */
IframeBrowser.prototype._createNavigationBar = function () {
    var navigationDiv = document.createElement('div'),
        wrapper = document.createElement('div'),
        closeButton = document.createElement('button');

    navigationDiv.style.height = '30px';
    navigationDiv.style.padding = '2px';
    navigationDiv.style.backgroundColor = '#404040';

    closeButton.innerHTML = '✖';
    closeButton.style.width = '30px';
    closeButton.style.height = '25px';

    closeButton.addEventListener('click', function (e) {
        setTimeout(function () {
            this.close();
        }.bind(this), 0);
    }.bind(this));

    wrapper.appendChild(closeButton);
    navigationDiv.appendChild(wrapper);

    return navigationDiv;
};

module.exports.IframeBrowser = IframeBrowser;
module.exports.SystemBrowser = SystemBrowser;
