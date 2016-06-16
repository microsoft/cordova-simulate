// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {

    var telemetry = require('telemetry-helper'),
        CompassWidget = require('./compass-widget'),
        compass = require('./compass');

    var baseProps = {
        plugin: 'cordova-plugin-device-orientation',
        panel: 'device-orientation'
    };

    function sendUITelemetry(control) {
        telemetry.sendUITelemetry(Object.assign({}, baseProps, {
            control: control
        }));
    }

    compass.initialize();

    function initialize() {
        var inputHeading = document.getElementById('compass-heading-value'),
            headingText = document.querySelector('[data-compass-heading="text"]');

        var compassWidget = new CompassWidget({
            container: document.getElementById('compass-widget'),
            headingUpdatedCallback: function (heading) {
                messages.emit('device-orientation-updated', heading.value, true);
            },
            sendUITelemetry: sendUITelemetry
        });
        compassWidget.initialize(compass.heading);

        inputHeading.addEventListener('change', function () {
            compassWidget.updateHeading(this.value);

            sendUITelemetry('compass-heading-value');
        });

        messages.on('device-orientation-updated', function (event, value) {
            compassWidget.setHeading(value);

            var heading = compassWidget.heading();
            compass.updateHeading(heading.value);
            inputHeading.value = heading.value;
            headingText.textContent = heading.direction;
        }, true); // global event
    }

    return {
        initialize: initialize
    };
};
