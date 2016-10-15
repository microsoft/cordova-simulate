// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {

    var utils = require('utils'),
        telemetry = require('telemetry-helper'),
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

        // Determine a scale to use for the compass. This treats a panel width of 320px as being "100%"
        var scale = parseFloat(window.getComputedStyle(document.querySelector('cordova-panel')).width) / 320;
        var container = document.querySelector('#device-orientation #compass-widget');
        var containerSize = (184 * scale) + 'px';
        container.style.width = containerSize;
        container.style.height = containerSize;

        var compassWidget = new CompassWidget({
            container: container,
            scale: scale,
            headingUpdatedCallback: function (heading) {
                messages.emit('device-orientation-updated', heading.value, true);
            },
            sendUITelemetry: sendUITelemetry
        });

        var updateHeadingValue = function () {
            var heading = compassWidget.heading();
            compass.updateHeading(heading.value);
            inputHeading.value = heading.value;
            headingText.textContent = heading.direction;
        };

        compassWidget.initialize(compass.heading);
        updateHeadingValue();

        inputHeading.addEventListener('change', function () {
            compassWidget.updateHeading(this.value);

            sendUITelemetry('compass-heading-value');
        });

        inputHeading.addEventListener('input', function () {
            if (!utils.isNumber(this.value) || (this.value < compass.Limits.MIN || this.value >= compass.Limits.MAX)) {
                this.value = compass.heading;
            }
        });

        messages.on('device-orientation-updated', function (event, value) {
            compassWidget.setHeading(value);
            updateHeadingValue();
        }, true); // global event
    }

    return {
        initialize: initialize
    };
};
