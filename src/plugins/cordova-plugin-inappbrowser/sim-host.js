// Copyright (c) Microsoft Corporation. All rights reserved.

var db = require('db'),
    telemetry = require('telemetry-helper');

var baseProps = {
    plugin: 'cordova-plugin-inappbrowser',
    panel: 'inappbrowser'
};

module.exports = function (messages) {
    var INAPPBROWSER_SELECTION = 'inappbrowser-key';
    var currentSelection = db.retrieve(INAPPBROWSER_SELECTION) || 'iframe';

    messages.register('inAppBrowserSelected', function (callback) {
        callback(null, currentSelection);
    });

    function updateSelection(selection) {
        currentSelection = selection;
        db.save(INAPPBROWSER_SELECTION, currentSelection);

        messages.emit('inappbrowser-selected', currentSelection);
    }

    function initialize() {
        var optionsGroup = document.getElementById('inappbrowser-options');

        optionsGroup.querySelector('[data-inappbrowser="' + currentSelection + '"]').checked = true;

        optionsGroup.addEventListener('click', function (event) {
            var target = event.target,
                selection = target.getAttribute('data-inappbrowser');

            if (currentSelection !== selection) {
                updateSelection(selection);

                // send telemetry event
                telemetry.sendUITelemetry(Object.assign({}, baseProps, { control: selection }));
            }
        });
    }

    return {
        initialize: initialize
    };
};
