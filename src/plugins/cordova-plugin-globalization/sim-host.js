// Copyright (c) Microsoft Corporation. All rights reserved.

// https://github.com/apache/cordova-plugin-globalization/

var telemetry = require('telemetry-helper');

var baseProps = {
    plugin: 'cordova-plugin-globalization',
    panel: 'globalization'
};

function initialize() {
    var globalizationData = require('./globalization-data');
    var languages = globalizationData.languages;
    var daysOfTheWeek = globalizationData.daysOfTheWeek;

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

    localeList.onchange = telemetry.sendUITelemetry.bind(this, Object.assign({}, baseProps, { control: 'locale-list' }));
    dayList.onchange = telemetry.sendUITelemetry.bind(this, Object.assign({}, baseProps, { control: 'day-list' }));

    // Clicking the checkbox's label fires the click event twice, so keep track of the previous state. Note that we can't use the change event because the component seems to swallow it.
    var previousDaylightState = false;
    var daylightCheckbox = document.querySelector('#is-daylight-checkbox');
    daylightCheckbox.onclick = function () {
        if (daylightCheckbox.checked !== previousDaylightState) {
            previousDaylightState = daylightCheckbox.checked;
            telemetry.sendUITelemetry(Object.assign({}, baseProps, { control: 'is-daylight-checkbox' }));
        }
    };
}

module.exports = {
    initialize: initialize
};
