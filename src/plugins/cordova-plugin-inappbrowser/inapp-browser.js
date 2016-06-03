// Copyright (c) Microsoft Corporation. All rights reserved.

// Events taken from cordova-plugin-inappbrowser implementation, and iframe approach
// based from https://github.com/apache/cordova-plugin-inappbrowser/blob/master/src/browser/InAppBrowserProxy.js

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

InAppBrowser.prototype.getCurrentUrl = function () {};

/**
 * JavaScript implementation of the Native call to show. The simulator browser should be
 * displayed.
 * Subclasses must implement this.
 */
InAppBrowser.prototype.show = function () {};

/**
 * Hide the simulator browser.
 * Subclasses must implement this.
 */
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
 * Execute the success callback specified at the native "open" call.
 * @param {string} eventName
 * @private
 */
InAppBrowser.prototype._success = function (eventName) {
    this._callbacks.success({
        type: eventName,
        url: this.getCurrentUrl()
    });
};

/**
 * Implementation of the System browser simulation. This uses a new browser window
 * as the system browser.
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

SystemBrowser.prototype.getCurrentUrl = function () {
    return (this._window ? this._window.location.href : '');
};

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
 * Implementation of the WebView type of InAppBrowser plugin. This creates an iframe
 * that simulates the embedded WebView.
 * @param {string} url
 * @param {Array} options
 * @param {function} success
 * @param {function} fail
 * @constructor
 */
function IframeBrowser(url, options, success, fail) {
    this._container = null;
    this._iframe = null;
    this._resizeCallback = this._resizeContainer.bind(this);
    this._isVisible = false;

    InAppBrowser.call(this, url, options, success, fail);
}

IframeBrowser.prototype = Object.create(InAppBrowser.prototype);
IframeBrowser.prototype.constructor = IframeBrowser;
IframeBrowser.prototype.parentClass = InAppBrowser.prototype;

IframeBrowser.prototype.getCurrentUrl = function () {
    return (this._iframe ? this._iframe.src : '');
};

IframeBrowser.prototype.show = function () {
    if (!this._container) {
        this._createFrame();
    }

    this._isVisible = true;

    this._iframe.src = this._url;
    this._container.style.display = 'block';

    this._resizeContainer();

    this._success(InAppBrowser.Events.LOAD_START);
};

IframeBrowser.prototype.close = function () {
    if (this._container) {
        this._container.parentNode.removeChild(this._container);
        this._container = null;
        this._isVisible = false;

        this._success(InAppBrowser.Events.EXIT);

        this._iframe = null;

        window.removeEventListener('resize', this._resizeCallback);
    }
};

IframeBrowser.prototype.hide = function () {
    if (this._container && this._isVisible) {
        this._container.style.display = 'none';
        this._isVisible = false;
    }
};

IframeBrowser.prototype.injectScriptCode = function (callback, args) {
    if (this._container && this._iframe) {
        var code = args[0].replace(/\r?\n|\r/g, ''),
            hasCallback = args[1];

        try {
            var result = this._injectCode(code);
            if (hasCallback) {
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
    if (this._container && this._iframe) {
        var css = args[0].replace(/\r?\n|\r/g, ''),
            hasCallback = args[1];

        var code = '(function () {' +
            'var head = document.getElementsByTagName("head")[0];' +
            'var style = document.createElement("style");' +
            'style.type = "text/css";' +
            'if (style.styleSheet) {' +
            'style.styleSheet.cssText = "' + css + '";' +
            '} else {' +
            'style.appendChild(document.createTextNode("' + css + '"));}' +
            'head.appendChild(style);' +
            '}());';

        try {
            var result = this._injectCode(code);
            if (hasCallback) {
                callback(result);
            }
        } catch (error) {
            console.error('Error occured while trying to inject style', error);
        }
    }
};

IframeBrowser.prototype.injectStyleFile = function (callback, args) {
    if (this._container && this._iframe) {
        var file = args[0],
            hasCallback = args[1];

        var code = '(function () {' +
            'var head = document.getElementsByTagName("head")[0];' +
            'var link = document.createElement("link");' +
            'link.type = "text/css";' +
            'link.rel = "stylesheet";' +
            'link.href = "' + file + '";' +
            'head.appendChild(link);' +
            '}());';

        try {
            var result = this._injectCode(code);
            if (hasCallback) {
                callback(result);
            }
        } catch (error) {
            console.error('Error occured while trying to inject a style file', error);
        }
    }
};

/**
 * @private
 */
IframeBrowser.prototype._createFrame = function () {
    this._container = document.createElement('div');
    this._iframe = document.createElement('iframe');

    // container style
    var style = this._container.style;
    style.position = 'absolute';
    style.border = '0';
    style.backgroundColor = '#ffffff';
    style.zIndex = '10000';
    style.width = document.body.clientWidth + 'px';
    style.height = document.body.clientHeight + 'px';

    // iframe style
    style = this._iframe.style;
    style.border = '0';
    style.width = '100%';

    if (!this._options.location || this._options.location === 'yes') {
        style.height = 'calc(100% - 35px)';

        this._container.appendChild(this._createNavigationBar());
    } else {
        style.height = '100%';
    }

    this._container.appendChild(this._iframe);

    document.body.appendChild(this._container);

    this._iframe.addEventListener('pageshow', this._success.bind(this, InAppBrowser.Events.LOAD_START));
    this._iframe.addEventListener('load', this._success.bind(this, InAppBrowser.Events.LOAD_STOP));
    this._iframe.addEventListener('error', this._success.bind(this, InAppBrowser.Events.LOAD_ERROR));
    this._iframe.addEventListener('abort', this._success.bind(this, InAppBrowser.Events.LOAD_ERROR));

    window.addEventListener('resize', this._resizeCallback);
};

/**
 * Creates a fake browser's navigation bar, that only contains a button to remove the iframe.
 * @private
 */
IframeBrowser.prototype._createNavigationBar = function () {
    var navigationDiv = document.createElement('div'),
        closeSpan = document.createElement('span');

    navigationDiv.style.height = '30px';
    navigationDiv.style.padding = '2px';
    navigationDiv.style.backgroundColor = '#404040';

    closeSpan.innerHTML = '✖';
    closeSpan.style.width = '30px';
    closeSpan.style.height = '25px';
    closeSpan.style.color = '#ffffff';
    closeSpan.style.fontSize = '22px';
    closeSpan.style.marginLeft = '5px';
    closeSpan.style.cursor = 'pointer';

    closeSpan.addEventListener('click', function (e) {
        setTimeout(function () {
            this.close();
        }.bind(this), 0);
    }.bind(this));

    navigationDiv.appendChild(closeSpan);

    return navigationDiv;
};

/**
 * Resize the main container with the document.body size, only when it is visible.
 * @private
 */
IframeBrowser.prototype._resizeContainer = function () {
    if (this._container && this._isVisible) {
        var body = document.body;

        this._container.style.width = body.clientWidth + 'px';
        this._container.style.height = body.clientHeight + 'px';
    }
};

/**
 * Execute the given code in the iframe context whenever it's possible. This may
 * throw an error when the URL loaded in the iframe is not in the same domain than
 * the application.
 * @throws It throws an error when the eval call from the iframe fails.
 * @private
 */
IframeBrowser.prototype._injectCode = function (code) {
    var result = this._iframe.contentWindow.eval(code);

    return result ? [result] : [];
};

/**
 * Create an instance of InAppBrowser based on the target type. When the type is '_system',
 * an instance of the system browser is created, when the type is '_blank', an instance of
 * a browser based on iframe is created. For any other target type, including '_self',
 * the current window will navigate to the given URL.
 * @param {function} success
 * @param {function} fail
 * @param {Array} args
 * @return {object}
 */
function create(success, fail, args) {
    // args[0]: url, args[1]: target, args[2]: options
    var Constructor;

    switch (args[1]) {
    case '_system':
        // open in a new browser tab
        Constructor = SystemBrowser;
        break;
    case '_self':
        // use the current window
        window.location = args[0];
        return;
    default:
        // "_blank" and any other option, use the iframe browser
        Constructor = IframeBrowser;
    }

    return new Constructor(args[0], args[2], success, fail);
}

module.exports.create = create;
