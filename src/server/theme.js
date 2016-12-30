// Copyright (c) Microsoft Corporation. All rights reserved.

var crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    log = require('./utils/log'),
    utils = require('./utils/jsUtils');

var selectorStateToken = '%state%';

// Properties that will be applied from the set of default properties if they're not defined for an element. Themes
// should define these properties on 'default' if they want them applied as defaults on the various element types.
var appliedDefaultProperties = {
    'body': ['background', 'color', 'font-family', 'font-size', 'font-weight'],
    'panel': ['border', 'background'],
    'panel-caption': ['font-family', 'font-size', 'font-weight', 'background'],
    'button': ['border', 'background', 'color', 'font-family', 'font-size', 'font-weight', 'outline'],
    'input': ['border', 'background', 'color', 'font-family', 'font-size', 'font-weight', 'outline'],
    'label': ['color', 'font-family', 'font-size', 'font-weight'],
    'value': ['color', 'font-family', 'font-size', 'font-weight'],
    'thumb': ['border', 'background'],
    'check': ['color', 'border', 'background']
};

// States that will be applied from the set of default states if they're not defined for an element
var appliedDefaultStates = {
    'panel': ['focus'],
    'panel-caption': ['focus'],
    'button': ['hover', 'focus'],
    'input': ['hover', 'focus'],
    'thumb': ['hover', 'focus'],
    'check': ['hover', 'focus']
};

module.exports = {
    createTheme: function (simHostRoot, theme) {
        var simHostThemeFile = path.resolve(simHostRoot, 'theme.js');
        if (!utils.existsSync(simHostThemeFile)) {
            // The current sim host does not support themes
            return null;
        }
        return new Theme(simHostRoot, theme, simHostThemeFile);
    }
};

/**
 * @constructor
 * @private
 */
function Theme(simHostRoot, theme, simHostThemeFile) {
    this._themeFileName = null;
    this._simHostThemeInfo = require(simHostThemeFile);
    this._simHostThemeFile = simHostThemeFile;
    this._simHostRoot = simHostRoot;
    this.themeObject = this._createThemeObject(theme);
}

Theme.prototype.getCssFileName = function () {
    // If a theme file was specified, and it still exists, ensure it is up-to-date
    if (this._themeFileName && utils.existsSync(this._themeFileName)) {
        this.themeObject = this._createThemeObject(this._themeFileName);
    }

    var simHostHash = createThemeHash(this._simHostThemeFile);
    var themeCssFileName = path.join(utils.getAppDataPath(), simHostHash + (this.themeObject ? '-' + createThemeHash(this.themeObject) : '') + '.css');
    if (!utils.existsSync(themeCssFileName)) {
        this._createThemeCssFile(themeCssFileName);
    }
    return themeCssFileName;
};

/**
 *
 * @param theme
 * @returns {{}}
 * @private
 */
Theme.prototype._createThemeObject = function (theme) {
    if (!theme) {
        // If no theme is specified, use the default theme defined by the sim-host
        return this._simHostThemeInfo.defaultTheme;
    }

    if (typeof theme === 'string') {
        if (utils.existsSync(theme)) {
            this._themeFileName = theme;
            theme = fs.readFileSync(theme, 'utf8');
        }

        try {
            return JSON.parse(theme);
        } catch (e) {
            log.warning('Specified theme was not a valid filename or JSON data: ' + e);
        }
        return this._simHostThemeInfo.defaultTheme;
    }

    if (typeof theme === 'object') {
        try {
            return JSON.parse(JSON.stringify(theme));
        } catch (e) {
            log.warning('Specified theme was not a valid filename or JSON data: ' + e);
        }
        return this._simHostThemeInfo.defaultTheme;
    }

    log.warning('Specified theme was not a valid filename or JSON data');
    return this._simHostThemeInfo.defaultTheme;
};

/**
 *
 * @private
 */
Theme.prototype._createThemeCssFile = function (themeCssFileName) {
    var elementSelectors = this._simHostThemeInfo.elementSelectors;

    // We don't want to pollute provided theme object (or hash will change)
    var themeObject = JSON.parse(JSON.stringify(this.themeObject));
    var css = [];

    var defaultProperties = getOrCreate(themeObject, 'default', {});
    var defaultElementNormalStateProperties = getOrCreate(defaultProperties, '', {});

    // Ensure defaultElementNormalStateProperties is fully populated with basic properties
    var defaultThemeProperties = this._simHostThemeInfo.defaultTheme.default[''];
    ['border', 'background', 'color', 'font-family', 'font-size', 'font-weight'].forEach(function (propertyName) {
        defaultElementNormalStateProperties[propertyName] = defaultElementNormalStateProperties[propertyName] ||
            defaultThemeProperties[propertyName];
    });

    Object.keys(elementSelectors).forEach(function (element) {
        var themeElementData = getOrCreate(themeObject, element, {});

        // Populate it with default data...
        var elementNormalStateProperties = getOrCreate(themeElementData, '', {});

        // First specific states...
        if (appliedDefaultStates[element]) {
            appliedDefaultStates[element].forEach(function (state) {
                var elementStateProperties = getOrCreate(themeElementData, state, {});
                var defaultElementStateProperties = getOrCreate(defaultProperties, state, {});
                appliedDefaultProperties[element].forEach(function (propertyName) {
                    // If not defined, fallback on normal state, then default for this state, then default normal state
                    elementStateProperties[propertyName] = elementStateProperties[propertyName] ||
                        elementNormalStateProperties[propertyName] ||
                        defaultElementStateProperties[propertyName] ||
                        defaultElementNormalStateProperties[propertyName];
                });
            });
        }

        // Then the normal state (we do this second so that other states get right defaults)...
        appliedDefaultProperties[element].forEach(function (propertyName) {
            // If not defined, fallback on default
            elementNormalStateProperties[propertyName] = elementNormalStateProperties[propertyName] ||
                defaultElementNormalStateProperties[propertyName];
        });

        // Now generate the CSS for each state
        var selector = elementSelectors[element];
        Object.keys(themeElementData).forEach(function (state) {
            outputSelectorProperties(css, selector, themeElementData[state], state);
        });
    });

    // If sim host provides a CSS file to be scaled, scale and append it. Scaling searches for sizes declared in pixels,
    // and scales them based on the current font size compared to the sim-host's default font size (always rounded to a
    // whole pixel). This works better than, say, em sizing, which results in fractional pixel sizes and inconsistent
    // results.
    var simHostScaledCssFile = path.resolve(this._simHostRoot, 'sim-host-scaled.css');
    if (utils.existsSync(simHostScaledCssFile)) {
        var defaultFontSize = this._simHostThemeInfo.defaultFontSize;
        var fontSize = parseFontSize(themeObject.default['']) || 16;
        var scaledCss = fs.readFileSync(simHostScaledCssFile, 'utf8');

        if (fontSize === defaultFontSize) {
            css.push(scaledCss);
        } else {
            var scale = fontSize / defaultFontSize;
            css.push(scaledCss.replace(/\b([0-9.]+)px\b/g, function (_, pixels) {
                return Math.round(pixels * scale) + 'px';
            }));
        }
    }

    fs.writeFileSync(themeCssFileName, css.join('\n'), 'utf8');
};

function getOrCreate(object, propertyName, defaultValue) {
    return object[propertyName] || (object[propertyName] = defaultValue);
}

function parseFontSize(cssProps) {
    // Look for the theme's default font size. Handles font size specified in the font-size or font properties, in
    // pixels, points or em units. If em units, assumes browser default font size of 16 pixels.
    var fontSize = cssProps['font-size'] || cssProps['font'];
    if (!fontSize) {
        return null;
    }

    var match = fontSize.match(/(?:\b(\d+)px\b)|(?:\b(\d+)pt\b)|(?:\b(\d+)em\b)/);
    return (match && (match[1] && parseFloat(match[1])) || (match[2] && parseFloat(match[2]) * 96 / 72) || (match[3] && parseFloat(match[3]) * 16)) || null;
}

function outputSelectorProperties(css, selector, properties, state) {
    // If selector is an array of selectors, we will output them as separate rules. This is important when selectors
    // contain browser specific bits that would break the overall selector in other browsers.
    if (!Array.isArray(selector)) {
        selector = [selector];
    }

    // Construct the property bundle
    var propertyBundle = [];
    Object.keys(properties).forEach(function (propertyName) {
        propertyBundle.push('  ' + propertyName + ': ' + properties[propertyName] + ';')
    });
    propertyBundle = propertyBundle.join('\n');

    // Output each rule
    selector.forEach(function (sel) {
        css.push(formatSelector(sel, state) + ' {');
        css.push(propertyBundle);
        css.push('}\n');
    });
}

function formatSelector(selector, state) {
    return selector.split(',').map(function (selector) {
        return appendState(selector.trim(), state);
    }).join(',\n');
}

function appendState(selector, state) {
    if (!state) {
        return selector.replace(selectorStateToken, '');
    }

    if (selector.indexOf(selectorStateToken) > -1) {
        // If the selector specifies where the state should go, put it there
        return selector.replace(selectorStateToken, ':' + state);
    }

    // Otherwise, Look for first pseudo-element in last selector - we want to put the state before that (so we're
    // detecting state on the actual element, not the pseudo-element).

    // Split selector on whitespace
    selector = selector.split(/\s+/g);

    var idx = selector[selector.length - 1].indexOf('::');
    if (idx > -1) {
        selector[selector.length - 1] = selector[selector.length - 1].substring(0, idx) + ':' + state + selector[selector.length - 1].substring(idx);
    } else {
        selector[selector.length - 1] = selector[selector.length - 1] + ':' + state;
    }

    return selector.join(' ');
}

function createThemeHash(themeObject) {
    return crypto.createHash('md5').update(JSON.stringify(themeObject)).digest('hex').substring(0, 8);
}
