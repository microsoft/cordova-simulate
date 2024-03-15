// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

const assert = require('assert');
var browser = require('../src/browsers/browser');

suite('browserHelper', function () {
    const currentSystem = process.platform;
    const chrome = 'chrome';
    const edge = 'edge';
    const chromium = 'chromium';
    const url = 'http://localhost:8000/index.html';
    const chromiumPath = 'chromium';

    test('Will get Chrome browser target with argument correctly for each system', async () => {
        const browserInfo = await browser.getBrowser(chrome, undefined, url, undefined);
        switch (currentSystem) {
            case 'win32':
                assert.strictEqual(browserInfo.includes('chrome'), true);
                assert.strictEqual(browserInfo.includes(url), false);
                assert.strictEqual(browserInfo.includes('--user-data-dir=\%TEMP\%\\cordova_simulate_temp_chrome_user_data_dir'), true);
                break;
            case 'darwin':
                assert.strictEqual(browserInfo.includes('Google Chrome'), true);
                assert.strictEqual(browserInfo.includes(url), false);
                assert.strictEqual(browserInfo.includes('--user-data-dir=/tmp/cordova_simulate_temp_chrome_user_data_dir'), true);
                break;
            case 'linux':
                assert.strictEqual(browserInfo.includes('google-chrome'), true);
                assert.strictEqual(browserInfo.includes(url), false);
                assert.strictEqual(browserInfo.includes('--user-data-dir=/tmp/cordova_simulate_temp_chrome_user_data_dir'), true);
                break;
        }
    });

    test('Will get Edge browser target with argument correctly for each system', async () => {
        const browserInfo = await browser.getBrowser(edge, undefined, url, undefined);
        switch (currentSystem) {
            case 'win32':
                assert.equal(browserInfo.includes('msedge'), true);
                assert.strictEqual(browserInfo.includes(url), true);
                assert.strictEqual(browserInfo.includes('--user-data-dir=\%TEMP\%\\cordova_simulate_temp_edge_user_data_dir'), true);
                break;
            case 'darwin':
                assert.strictEqual(browserInfo.includes('Microsoft Edge'), true);
                assert.strictEqual(browserInfo.includes(url), true);
                assert.strictEqual(browserInfo.includes('--user-data-dir=/tmp/cordova_simulate_temp_edge_user_data_dir'), true);
                break;
            case 'linux':
                assert.strictEqual(browserInfo.includes('microsoft-edge'), true);
                assert.strictEqual(browserInfo.includes(url), true);
                assert.strictEqual(browserInfo.includes('--user-data-dir=/tmp/cordova_simulate_temp_edge_user_data_dir'), true);
                break;
        }
    });

    test('Will get Chromium browser target with argument correctly for each system', async () => {
        const browserInfo = await browser.getBrowser(chromium, undefined, url, chromiumPath);
        switch (currentSystem) {
            case 'win32':
                assert.strictEqual(browserInfo.includes(chromiumPath), true);
                assert.strictEqual(browserInfo.includes(url), false);
                break;
            case 'darwin':
                assert.strictEqual(browserInfo.includes(chromiumPath), true);
                assert.strictEqual(browserInfo.includes('chromium'), true);
                assert.strictEqual(browserInfo.includes(url), false);
                break;
            case 'linux':
                assert.strictEqual(browserInfo.includes(chromiumPath), true);
                assert.strictEqual(browserInfo.includes('chromium-browser'), true);
                assert.strictEqual(browserInfo.includes(url), false);
                break;
        }
    });

    test('Should return without browser info if Showbrowser argument is set to false', async () => {
        var opts = {};
        opts.target = chrome;
        opts.url = url;
        opts.showBrowser = false;
        const browserInfo = await browser.launchBrowser(opts);
        assert.strictEqual(browserInfo, undefined);
    });
});

