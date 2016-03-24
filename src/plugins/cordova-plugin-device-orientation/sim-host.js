// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {

    var CompassWidget = require('./compass-widget'),
        compass = require('./compass');

    compass.initialize();

    function initialize() {
        var inputHeading = document.getElementById('compass-heading-value'),
            headingText = document.querySelector('[data-compass-heading="text"]');

        var compassWidget = new CompassWidget({
            container: document.getElementById('compass-widget'),
            headingUpdatedCallback: function (heading) {
                messages.emit('device-orientation-updated', heading.value, true);
            }
        });
        compassWidget.initialize(compass.heading);

        inputHeading.addEventListener('input', function () {
            compassWidget.updateHeading(this.value);
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
