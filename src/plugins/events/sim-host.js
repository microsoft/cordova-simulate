// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function(messages) {
    function initialize() {
        var eventList = document.getElementById('event-list');
        var events = ['deviceready', 'backbutton', 'menubutton', 'pause', 'resume', 'searchbutton', 'online', 'offline'];
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
