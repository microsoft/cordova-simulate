// Copyright (c) Microsoft Corporation. All rights reserved.

var telemetry = require('telemetry-helper');

var baseProps = {
    plugin: 'events',
    panel: 'events'
};

module.exports = function (messages) {
    function initialize() {
        var eventList = document.getElementById('event-list');
        var events = ['backbutton', 'menubutton', 'pause', 'resume', 'searchbutton', 'online', 'offline'];
        events.forEach(function (event) {
            var option = document.createElement('option');
            option.value = event;
            var caption = document.createTextNode(event);
            option.appendChild(caption);
            eventList.appendChild(option);
        });
        document.getElementById('event-fire').addEventListener('click', function () {
            var eventList = document.getElementById('event-list');
            var option = eventList.options[eventList.selectedIndex];

            telemetry.sendUITelemetry(Object.assign({}, baseProps, { control: 'event-fire', value: option.value }));
            messages.call('event', option.value).then(function (result) {
                console.log('Fired event: ' + result);
            }, function (err) {
                console.log('Firing event failed: ' + err);
            });
        });
    }

    return {
        initialize: initialize
    };
};
