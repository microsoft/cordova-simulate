// Copyright (c) Microsoft Corporation. All rights reserved.

// Based in part on code from Apache Ripple (https://github.com/apache/incubator-ripple)

var moment = require('./moment');
var accounting = require('./accounting');
var GlobalizationError = require('./GlobalizationError');
var globalizationData = require('./globalization-data');

// HANDLER FUNCTIONS

function numberToString (win, fail, args) {
    var options = args[0].options || { type : 'decimal' },
        number = args[0].number,
        value;
    options.type = options.type || 'decimal';

    try {
        validateNumberOptionType(options.type);
    } catch (e) {
        fail(new GlobalizationError(GlobalizationError.FORMATTING_ERROR,
            e.hasOwnProperty('message')? e.message : e));
        return;
    }

    switch (options.type) {
        case 'currency':
            value = accounting.formatMoney(number);
            break;
        case 'percent':
            value = accounting.formatNumber(Math.round(number * 100)) + '%';
            break;
        case 'decimal':
            value = accounting.formatNumber(number);
            break;
    }

    win({ value: value });
}

function getDateNames (win, fail, args) {
    try {
        var options = args[0].options || { type: 'wide', item: 'months' };
        var type = options.type || 'wide';
        var item = options.item || 'item';

        var locale = getLocaleName();

        if (item === 'months' && type === 'wide') {
            options = { month: 'long' };
        } else if (item === 'months' && type === 'narrow') {
            options = { month: 'short'};
        } else if (item === 'days' && type === 'wide') {
            options = { weekday: 'long'};
        } else if (item === 'days' && type === 'narrow') {
            options = { weekday: 'short'};
        } else {
            throw 'Incorrect type or item';
        }

        var result = [];
        if (item === 'months') {
            for (var i = 0; i < 12; i++) {
                var date = new Date(2014, i, 20, 0, 0, 0, 0);
                result[i] = date.toLocaleDateString(locale, options);
            }
        } else {
            result = getWeekDayNames(locale, options);
        }

        win({ value: result });
    } catch (e) {
        fail({ code: 0, message: e.hasOwnProperty('message')? e.message : e });
    }
}

function getDatePattern (win, fail) {
    try {
        var formatter = new Intl.DateTimeFormat(getLocaleName());
        var hasResolved = formatter.hasOwnProperty('resolved');
        var timezone =  hasResolved ? formatter.resolved.timeZone : '';
        var dstOffset = dstOffsetAbs(new Date());

        win( {
            utc_offset: new Date().getTimezoneOffset() * (-60),
            dst_offset: dstOffset * 60,
            timezone: timezone,
            pattern: hasResolved ? formatter.resolved.pattern : ''
        });
    } catch (e) {
        fail(new GlobalizationError(GlobalizationError.PATTERN_ERROR,
            e.hasOwnProperty('message')? e.message : e));
    }
}

function getNumberPattern (win, fail, args) {
    var options = args[0].options || { type : 'decimal'};
    options.type = options.type || 'decimal';

    try {
        validateNumberOptionType(options.type);
    } catch (e) {
        fail(new GlobalizationError(GlobalizationError.PATTERN_ERROR,
            e.hasOwnProperty('message')? e.message : e));
        return;
    }

    var pattern,
        settings;

    switch (options.type) {
        case 'decimal':
            pattern = globalizationData.numberPatterns.NUMBER;
            settings = accounting.settings.number;
            break;
        case 'currency':
            settings = accounting.settings.currency;
            pattern = settings.symbol + globalizationData.numberPatterns.CURRENCY;
            break;
        case 'percent':
            settings = {
                precision: 0,
                decimal: accounting.settings.number.decimal,
                thousand: accounting.settings.number.thousand
            };
            pattern = globalizationData.numberPatterns.PERCENTAGE;
            break;
    }

    win({
        pattern: pattern,
        symbol: '.',
        fraction: 0,
        rounding: settings.precision,
        positive: '',
        negative: '-',
        decimal: settings.decimal,
        grouping: settings.thousand
    });
}

function getCurrencyPattern (win, fail, args) {
    var currency = accounting.settings.currency,
        pattern = currency.symbol + globalizationData.numberPatterns.CURRENCY;

    win({
        pattern: pattern,
        code: args[0].currencyCode,
        fraction: 0,
        rounding: currency.precision,
        decimal: accounting.settings.currency.decimal,
        grouping: accounting.settings.currency.thousand
    });
}

function stringToDate (win, fail, args) {
    try {
        var options = prepareAndGetDateOptions(args[0].options);
        moment.locale(getLocaleName());

        var date = moment(args[0].dateString, options).toDate();

        win({
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            second: date.getSeconds(),
            millisecond: date.getMilliseconds()
        });
    } catch (e) {
        fail(new GlobalizationError(GlobalizationError.PARSING_ERROR,
            e.hasOwnProperty('message')? e.message : e));
    }
}

function stringToNumber (win, fail, args) {
    try {
        var numberString = args[0].numberString;

        win({ value: accounting.unformat(numberString) });
    } catch (e) {
        fail(new GlobalizationError(GlobalizationError.FORMATTING_ERROR,
            e.hasOwnProperty('message')? e.message : e));
    }
}

function dateToString (win, fail, args) {
    try {
        var date = new Date(args[0].date);
        var options = prepareAndGetDateOptions(args[0].options);
        moment.locale(getLocaleName());

        win({ value : moment(date).format(options)});
    } catch (e) {
        fail(new GlobalizationError(GlobalizationError.FORMATTING_ERROR,
            e.hasOwnProperty('message')? e.message : e));
    }
}

function getLocaleNameHandle (win, lose) {
    win({value: getLocaleName()});
}

function isDayLightSavingsTime (win, lose) {
    var daylightCheckbox = document.querySelector('#is-daylight-checkbox');
    win({dst: daylightCheckbox.checked});
}

function getFirstDayOfWeek (win, lose) {
    var daysOfWeekList = document.querySelector('#day-list');
    var selectedDay = daysOfWeekList.selectedIndex + 1; // it starts from 1
    win({value: selectedDay});
}

// HELPER FUNCTIONS

function validateNumberOptionType(type) {
    if (type !== 'decimal' &&
        type !== 'currency' &&
        type !== 'percent') {
        throw 'The options.type can be \'decimal\', \'percent\' or \'currency\'';
    }
}

function getWeekDayNames(locale, options) {
    var result = [];
    for (var i = 0; i < 7; i++) {
        var date = new Date(2014, 5, i + 1, 0, 0, 0, 0);
        result[i] = date.toLocaleDateString(locale, options);
    }
    return result;
}

function convertToMomentLocalizedFormat(options) {
    var selectorError = 'The options.selector can be \'date\', \'time\' or \'date and time\'';
    var formatLengthError = 'The options.formatLength can be \'short\', \'medium\', \'long\', or \'full\'';

    switch (options.formatLength) {
        case 'short':
            switch(options.selector) {
                case 'date and time': return 'lll';
                case 'date': return 'l';
                case 'time': return 'LT';
                default:
                    throw selectorError;
            }
        case 'medium':
            switch(options.selector) {
                case 'date and time': return 'LLL';
                case 'date': return 'L';
                case 'time':
                    throw '\'time\' selector does not support \'medium\' formatLength';
                default:
                    throw selectorError;
            }
        case 'long':
            switch(options.selector) {
                case 'date and time': return 'llll';
                case 'date': return 'll';
                case 'time':
                    throw '\'time\' selector does not support \'long\' formatLength';
                default:
                    throw selectorError;
            }
        case 'full':
            switch(options.selector) {
                case 'date and time': return 'LLLL';
                case 'date': return 'LL';
                case 'time': return 'LTS';
                default:
                    throw selectorError;
            }
        default:
            throw formatLengthError;
    }
}

function prepareAndGetDateOptions(options) {
    options = options || {formatLength:'short', selector:'date and time'};
    options.formatLength = options.formatLength || 'short';
    options.selector = options.selector || 'date and time';

    return convertToMomentLocalizedFormat(options);
}

function dstOffsetAbs(date) {
    var janOffset = new Date(date.getFullYear(), 0, 20).getTimezoneOffset();
    var julOffset = new Date(date.getFullYear(), 6, 20).getTimezoneOffset();
    if (janOffset < 0) { janOffset = -janOffset; }
    if (julOffset < 0) { julOffset = -julOffset; }
    var offset =  janOffset - julOffset;
    if (offset < 0) { offset = -offset; }
    return offset;
}

function getLocaleName () {
    var localeList = document.querySelector('#locale-list');
    return globalizationData.locales[localeList.selectedIndex];
}

module.exports = {
    Globalization: {
        'getLocaleName': getLocaleNameHandle,
        'getPreferredLanguage': getLocaleNameHandle,
        'isDayLightSavingsTime': isDayLightSavingsTime,
        'getFirstDayOfWeek': getFirstDayOfWeek,
        'numberToString': numberToString,
        'getCurrencyPattern': getCurrencyPattern,
        'dateToString': dateToString,
        'stringToDate': stringToDate,
        'getDatePattern': getDatePattern, // HALF SUPPORTED (see Browser Quirks)
        'getDateNames': getDateNames,
        'stringToNumber': stringToNumber,
        'getNumberPattern': getNumberPattern // HALF SUPPORTED (see Browser Quirks)
    }
};
