// Copyright (c) Microsoft Corporation. All rights reserved.

var db = require('db'),
    event = require('event');

var _sims = null;

module.exports = {
    get sims() {
        if (!_sims) {
            _sims = db.retrieveObject('saved-sims') || [];
        }
        return _sims;
    },

    addSim: function (sim) {
        var sims = this.sims;
        sims.push(sim);
        db.saveObject('saved-sims', sims);
        event.trigger('saved-sim-added', [sim]);
    },

    removeSim: function (sim) {
        var sims = this.sims;
        var simIndex = sim;
        if (typeof simIndex === 'object') {
            simIndex = sims.indexOf(simIndex);
            if (simIndex < 0) {
                throw 'Tried to remove sim object that didn\'t exist';
            }
        } else if (typeof simIndex === 'number') {
            if (simIndex < 0 || simIndex >= sims.length) {
                throw 'Invalid saved sim index ' + simIndex + ' (should be from 0 to ' + sims.length - 1 + ')';
            }
            sim = sims[simIndex];
        } else {
            throw 'Invalid value passed to removeSim(): ' + sim;
        }

        sims.splice(simIndex, 1);
        db.saveObject('saved-sims', sims);
        event.trigger('saved-sim-removed', [sim, simIndex]);
    },

    findSavedSim: function(service, action) {
        var sims = this.sims;

        var savedSim = null;

        sims.some(function (sim) {
            if (sim.service === service && sim.action === action) {
                savedSim = sim;
                return true;
            }
            return false;
        });

        return savedSim;
    }
};

