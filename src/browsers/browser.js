// Copyright (c) Microsoft Corporation. All rights reserved.

/* globals Promise: true */

const child_process = require('child_process');
const open = require('open');

const NOT_INSTALLED = 'The browser target is not installed: %target%';
const NOT_SUPPORTED = 'The browser target is not supported: %target%';

/**
 * Launches the specified browser with the given URL.
 * Based on Apache cordova-serve: https://github.com/apache/cordova-serve
 */
function launchBrowser(opts) {
    opts = opts || {};
    let target = opts.target || 'default';
    const url = opts.url || '';
    let showBrowser = opts.showBrowser;

    // Handle showbrowser argument sent from cordova-tools and other unknown scenarios
    // Only showbrowser = false will return method
    if (showBrowser == false) {
        return;
    }

    target = target.toLowerCase();
    if (target === 'default') {
        open(url);
        return Promise.resolve();
    } else {
        return getBrowser(target, opts.dataDir, url).then(browser => {
            let args;

            switch (process.platform) {
                case 'darwin':
                    args = ['open'];
                    if (target === 'chrome') {
                        args.push('-n');
                    }
                    args.push('-a', browser);
                    break;
                case 'win32':
                    args = ['cmd /c start ""', browser];
                    break;
                case 'linux':
                    args = [browser];
                    break;
            }

            if (target != 'edge') {
                args.push(url);
            }

            const command = args.join(' ');
            const result = exec(command);
            result.catch(() => {
                throw new Error(NOT_INSTALLED.replace('%target%', target));
            });
            return result;
        });
    }
}

function getBrowser(target, dataDir, url) {
    if (target == 'chrome') {
        dataDir = dataDir || 'cordova_simulate_temp_chrome_user_data_dir';
    } else if (target == 'edge') {
        dataDir = dataDir || 'cordova_simulate_temp_edge_user_data_dir';
    }

    const chromeArgs = ` --user-data-dir=/tmp/${dataDir}`;
    const browsers = {
        win32: {
            chrome: `chrome --user-data-dir=%TEMP%\\${dataDir}`,
            opera: 'opera',
            firefox: 'firefox',
            edge: `msedge ${url} --user-data-dir=%TEMP%\\${dataDir}`
        },
        darwin: {
            chrome: `"Google Chrome" --args${chromeArgs}`,
            chromium: 'chromium',
            safari: 'safari',
            firefox: 'firefox',
            opera: 'opera',
            edge: `"Microsoft Edge" ${url} --args${chromeArgs}`
        },
        linux: {
            chrome: `google-chrome${chromeArgs}`,
            chromium: 'chromium-browser',
            firefox: 'firefox',
            opera: 'opera',
            edge: `microsoft-edge ${url} --args${chromeArgs}`
        }
    };

    if (target in browsers[process.platform]) {
        return Promise.resolve(browsers[process.platform][target]);
    } else {
        return Promise.reject(NOT_SUPPORTED.replace('%target%', target));
    }
}

function exec(cmd, opt_cwd) {
    return new Promise((resolve, reject) => {
        try {
            const opt = { cwd: opt_cwd, maxBuffer: 1024000 };
            let timerID = 0;
            if (process.platform === 'linux') {
                timerID = setTimeout(() => {
                    resolve('linux-timeout');
                }, 5000);
            }
            child_process.exec(cmd, opt, (err, stdout, stderr) => {
                clearTimeout(timerID);
                if (err) {
                    reject(new Error(`Error executing "${cmd}": ${stderr}`));
                } else {
                    resolve(stdout);
                }
            });
        } catch (e) {
            console.error(`error caught: ${e}`);
            reject(e);
        }
    });
}

module.exports.launchBrowser = launchBrowser;
module.exports.getBrowser = getBrowser;
