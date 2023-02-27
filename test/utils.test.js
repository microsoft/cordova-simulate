// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

const assert = require('assert');
const path = require('path');
var plugins = require('../src/server/utils/plugins');

suite('utilVerification', function () {
    test('findPluginPath will get built in plugin target if no plugin in project path', (done) => {
        var pluginPath = plugins.findPluginPath(path.resolve('./resources/testSampleProject'), 'cordova-plugin-camera', false);
        var builtInPath = path.resolve('src/plugins/cordova-plugin-camera');
        assert.strictEqual(pluginPath, builtInPath);
        done();
    });
});

