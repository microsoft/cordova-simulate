// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

const assert = require('assert');
var browser = require('../src//browsers/browser');

suite('browserHelper', function () {
    const currentSystem =  process.platform;
    const chrome = 'chrome';
    const edge = 'edge';
    const url = 'http://localhost:8000/index.html';

    test('Will get Chrome browser target with argument correctly for each system', (done) => {
        browser.getBrowser(chrome, undefined, url).then(browsers => {
            switch (currentSystem) {
                case 'win32':
                    assert.strictEqual(browsers.include('chrome'), true);
                    assert.strictEqual(browsers.include(url), false);
                    assert.strictEqual(browsers.include('--user-data-dir=/tmp/cordova_simulate_temp_chrome_user_data_dir'), true);
                    break;
                case 'darwin':
                    assert.strictEqual(browsers.include('Google Chrome'), true);
                    assert.strictEqual(browsers.include(url), false);
                    assert.strictEqual(browsers.include('--user-data-dir=/tmp/cordova_simulate_temp_chrome_user_data_dir'), true);
                    break;
                case 'linux':
                    assert.strictEqual(browsers.include('google-chrome'), true);
                    assert.strictEqual(browsers.include(url), false);
                    assert.strictEqual(browsers.include('--user-data-dir=/tmp/cordova_simulate_temp_chrome_user_data_dir'), true);
                    break;
            }
        });
        done();
    });

    test('Will get Edge browser target with argument correctly for each system', (done) => {
        browser.getBrowser(edge, undefined, url).then(browsers => {
            switch (currentSystem) {
                case 'win32':
                    assert.strictEqual(browsers.include('msedge'), true);
                    assert.strictEqual(browsers.include(url), true);
                    assert.strictEqual(browsers.include('--user-data-dir=/tmp/cordova_simulate_temp_chrome_user_data_dir'), true);
                    break;
                case 'darwin':
                    assert.strictEqual(browsers.include('Microsoft Edge'), true);
                    assert.strictEqual(browsers.include(url), true);
                    assert.strictEqual(browsers.include('--user-data-dir=/tmp/cordova_simulate_temp_chrome_user_data_dir'), true);
                    break;
                case 'linux':
                    assert.strictEqual(browsers.include('microsoft-edge'), true);
                    assert.strictEqual(browsers.include(url), true);
                    assert.strictEqual(browsers.include('--user-data-dir=/tmp/cordova_simulate_temp_chrome_user_data_dir'), true);
                    break;
            }
        });
        done();
    });
});

