// Copyright (c) Microsoft Corporation. All rights reserved.

/*global CordovaLabeledValue: false, CordovaItem: false */
// These globals are cordova-simulate custom elements.

var savedSims = require('./saved-sims');
var event = require('event');

var emptyLabel;
var execList;

module.exports = {
    initialize: function () {
        var sims = savedSims.sims;

        emptyLabel = document.getElementById('empty-label');
        execList = document.getElementById('exec-list');
        execList.addEventListener('itemremoved', function (e) {
            savedSims.removeSim(e.detail.itemIndex);

            if (!savedSims.sims.length) {
                showEmptyLabel();
            }
        });

        event.on('saved-sim-added', function (sim) {
            hideEmptyLabel();
            execList.addItem(cordovaItemFromSim(sim));
        });

        if (sims && sims.length) {
            sims.forEach(function (sim) {
                execList.addItem(cordovaItemFromSim(sim));
            });
        } else {
            // Create a "No values saved" item
            showEmptyLabel();
        }
    }
};

function cordovaItemFromSim(sim) {
    var labeledValue = new CordovaLabeledValue();
    labeledValue.label = sim.service + '.' + sim.action;

    var value = sim.value;
    if (typeof value === 'object') {
        try {
            value = JSON.stringify(value);
        } catch (e) {
            // ignore
        }
    }

    labeledValue.value = value;
    var cordovaItem = new CordovaItem();
    cordovaItem.appendChild(labeledValue);
    return cordovaItem;
}

function showEmptyLabel() {
    emptyLabel.classList.remove('cordova-hidden');
    execList.classList.add('cordova-hidden');
}

function hideEmptyLabel() {
    emptyLabel.classList.add('cordova-hidden');
    execList.classList.remove('cordova-hidden');
}

