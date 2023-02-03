// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

const assert = require('assert');
const path = require('path');
var Simulator = require('../src/server/simulator');

suite('simulatorProcess', function () {
    test('After simulator init, simulator.state should be IDLE', (done) => {
        const options = require('./resources/options.json');
        options.dir = path.join(__dirname, './resources/testSampleProject');
        var simulator = new Simulator(options);
        assert.equal(simulator._state, Simulator.State.IDLE);
        done();
    });
});

