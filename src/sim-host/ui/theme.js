// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    elementSelectors: {
        'body': 'body',
        'input': ['cordova-combo /deep/ select, body /deep/ textarea, body /deep/ input[type^=text], body /deep/ input[type^=number], body /deep/ input[type^=checkbox]',
            'input[type=range]::-ms-fill-lower, input[type=range]::-ms-fill-upper',
            'input[type=range]::-webkit-slider-runnable-track',
            'input[type=range]::-moz-range-track'],
        'thumb': ['input[type=range]::-ms-thumb', 'input[type=range]::-webkit-slider-thumb','input[type=range]::-moz-range-thumb'],
        'check': '::-ms-check',
        'button': 'body /deep/ button, body /deep/ .cordova-item-wrapper',
        'label': 'body /deep/ label',
        'value': 'body /deep/ .cordova-value',
        'panel': 'body /deep/ .cordova-panel-inner',
        'panel-caption': 'body /deep/ .cordova-panel-inner%state% .cordova-header'
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

    defaultFontSize: 13
};