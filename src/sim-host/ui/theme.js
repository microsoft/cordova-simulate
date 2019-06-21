// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    elementSelectors: {
        'body': 'body',
        'input': ['select', 'textarea, input[type^=text], input[type^=number], input[type^=checkbox]',
            'input[type=range]::-ms-fill-lower, input[type=range]::-ms-fill-upper',
            'input[type=range]::-webkit-slider-runnable-track',
            'input[type=range]::-moz-range-track'],
        'thumb': ['input[type=range]::-ms-thumb', 'input[type=range]::-webkit-slider-thumb','input[type=range]::-moz-range-thumb'],
        'check': '::-ms-check',
        'button': 'button, .cordova-item-wrapper',
        'label': 'label',
        'value': '.cordova-value',
        'panel': '.cordova-panel-inner',
        'panel-caption': '.cordova-panel-inner%state% .cordova-header'
    },

    defaultTheme: {
        'default': {
            '': {
                'border': '1px solid rgb(211,211,211)',
                'background': 'white',
                'font-family': '"Helvetica Neue", "Roboto", "Segoe UI", sans-serif',
                'font-size': '13px',
                'font-weight': 'normal',
                'color': 'black'
            },
            'hover': {
                'color': 'rgb(33,33,33)',
                'background': 'rgb(240,240,240)',
                'border': '1px solid rgb(160,160,160)'
            },
            'focus': {
                'color': 'rgb(33,33,33)',
                'background': 'rgb(240,240,240)',
                'border': '1px solid rgb(160,160,160)',
                'outline': 'none'
            }
        },
        'button': {
            'active:hover': {
                'color': 'white',
                'background': 'rgb(160,160,160)',
                'border': '1px solid rgb(160,160,160)'
            }
        },
        'label': {
            '': {
                'color': 'rgba(0,0,0,0.95)'
            }
        },
        'panel': {
            '': {
                'border': '1px solid rgba(0, 0, 0, 0.785)',
                'background': 'rgba(255,255,255,0.97)'
            },
            'focus': {
                'border': '1px solid rgb(128,128,128)',
                'outline': 'none'
            }
        },
        'panel-caption': {
            '': {
                'background': 'black',
                'opacity': '0.7',
                'color': 'rgb(204,204,204)',
                'text-transform': 'uppercase',
                'font-weight': 'bold'
            },
            'focus': {
                'background': 'rgb(128,128,128)',
                'color': 'black'
            }
        },
        'thumb': {
            '': {
                'border': '1px solid rgb(160,160,160)'
            }
        },
        'check': {
            '': {
                'border': '1px solid rgb(160,160,160)'
            }
        }
    },

    defaultFontSize: 13,

    doCustom: function (css, themeObject) {
        // Support scroll bar colors. Note that this is only supported for IE, because Webkit/Chrome makes it too difficult.
        var scrollBarColors = themeObject.scrollbar && themeObject.scrollbar[''];
        if (scrollBarColors) {
            var ieScrollBarColorCssProperties = [];
            if (scrollBarColors.arrow) {
                ieScrollBarColorCssProperties.push('  scrollbar-arrow-color: ' + scrollBarColors.arrow + ';');
            }

            if (scrollBarColors.face) {
                ieScrollBarColorCssProperties.push('  scrollbar-face-color: ' + scrollBarColors.face + ';');
            }

            if (scrollBarColors.background) {
                ieScrollBarColorCssProperties.push('  scrollbar-3dlight-color: ' + scrollBarColors.background + ';');
                ieScrollBarColorCssProperties.push('  scrollbar-darkshadow-color: ' + scrollBarColors.background + ';');
                ieScrollBarColorCssProperties.push('  scrollbar-highlight-color: ' + scrollBarColors.background + ';');
                ieScrollBarColorCssProperties.push('  scrollbar-shadow-color: ' + scrollBarColors.background + ';');
                ieScrollBarColorCssProperties.push('  scrollbar-track-color: ' + scrollBarColors.background + ';');
            }

            if (ieScrollBarColorCssProperties.length) {
                css.push('body {');
                css.push(ieScrollBarColorCssProperties.join('\n'));
                css.push('}');
            }
        }
    }
};