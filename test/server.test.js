// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

const assert = require("assert");

suite("simulateServer", function () {
    test("Simulator server can be started successfully.", (done) => {
        var Simulator = require('../src/server/simulator');
        const options = require('./resources/options.json');
        var simulator = new Simulator(options);
        assert.equal(simulator._state, Simulator.State.IDLE, "New created simulator should in IDLE state.");

        var start = simulator.startSimulation();
        assert.equal(simulator._state, Simulator.State.STARTING, "Simulate server");


        simulator._state = Simulator.State.RUNNING;
        simulator.stopSimulation();
        done();
    });
});
