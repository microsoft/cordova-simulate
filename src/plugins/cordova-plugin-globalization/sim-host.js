// Copyright (c) Microsoft Corporation. All rights reserved.
 
// https://github.com/apache/cordova-plugin-globalization/

var languages = [
    'English',
    'English (Canadian)',
    'French',
    'French (Canadian)',
    'German',
    'Русский'
];

var daysOfTheWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

function initialize () {
    var localeList = document.querySelector('#locale-list');
    var dayList = document.querySelector('#day-list');

    languages.forEach(function (locale) {
        var option = document.createElement('option');
        option.value = locale;
        var caption = document.createTextNode(locale);
        option.appendChild(caption);
        localeList.appendChild(option);
    });

    daysOfTheWeek.forEach(function (day) {
        var option = document.createElement('option');
        option.value = day;
        var caption = document.createTextNode(day);
        option.appendChild(caption);
        dayList.appendChild(option);
    });
}

module.exports = {
    initialize: initialize
};
