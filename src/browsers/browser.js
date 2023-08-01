/**
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

/* Refactor this function from cordova-serve to support microsoft edge browser for each OS */

/* globals Promise: true */

const child_process = require('child_process');
const fs = require('fs');
const open = require('open');
const which = require('which');

const NOT_INSTALLED = 'The browser target is not installed: %target%';
const NOT_SUPPORTED = 'The browser target is not supported: %target%';

/**
 * Launches the specified browser with the given URL.
 * Based on https://github.com/domenic/opener
 * @param {{target: ?string, url: ?string, dataDir: ?string}} opts - parameters:
 *   target - the target browser - ie, chrome, safari, opera, firefox or chromium
 *   url - the url to open in the browser
 *   dataDir - a data dir to provide to Chrome (can be used to force it to open in a new window)
 * @return {Promise} Promise to launch the specified browser
 */
function launchBrowser(opts) {
    opts = opts || {};
    let target = opts.target || 'default';
    const url = opts.url || '';

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
                        // Chrome needs to be launched in a new window. Other browsers, particularly, opera does not work with this.
                        args.push('-n');
                    }
                    args.push('-a', browser);
                    break;
                case 'win32':
                    args = ['cmd /c start ""', browser];
                    break;
                case 'linux':
                    // if a browser is specified, launch it with the url as argument
                    // otherwise, use xdg-open.
                    args = [browser];
                    break;
            }

            if (target != "edge") {
                args.push(url);
            }
            const command = args.join(' ');
            const result = exec(command);
            result.catch(() => {
                // Assume any error means that the browser is not installed and display that as a more friendly error.
                throw new Error(NOT_INSTALLED.replace('%target%', target));
            });
            return result;

            // return exec(command).catch(function (error) {
            //     // Assume any error means that the browser is not installed and display that as a more friendly error.
            //     throw new Error(NOT_INSTALLED.replace('%target%', target));
            // });
        });
    }
};

function getBrowser(target, dataDir, url) {
    if (target == "chrome") {
        dataDir = dataDir || 'cordova_simulate_temp_chrome_user_data_dir';
    } else if (target == "edge") {
        dataDir = dataDir || 'cordova_simulate_temp_edge_user_data_dir';
    }

    const chromeArgs = ` --user-data-dir=/tmp/${dataDir}`;
    const browsers = {
        win32: {
            ie: 'iexplore',
            chrome: `chrome --user-data-dir=%TEMP%\\${dataDir}`,
            safari: 'safari',
            opera: 'opera',
            firefox: 'firefox',
            edge: `msedge ${url} --user-data-dir=%TEMP%\\${dataDir}`
        },
        darwin: {
            chrome: `"Google Chrome" --args${chromeArgs}`,
            safari: 'safari',
            firefox: 'firefox',
            opera: 'opera',
            edge: `"Microsoft Edge" ${url} --args${chromeArgs}`
        },
        linux: {
            chrome: `google-chrome${chromeArgs}`,
            chromium: `chromium-browser${chromeArgs}`,
            firefox: 'firefox',
            opera: 'opera',
            edge: `"Microsoft Edge" ${url} --args${chromeArgs}`
        }
    };

    if (target in browsers[process.platform]) {
        const browser = browsers[process.platform][target];
        return checkBrowserExistsWindows(browser, target).then(() => browser);
    } else {
        return Promise.reject(NOT_SUPPORTED.replace('%target%', target));
    }
}

// err might be null, in which case defaultMsg is used.
// target MUST be defined or an error is thrown.
function getErrorMessage(err, target, defaultMsg) {
    let errMessage;
    if (err) {
        errMessage = err.toString();
    } else {
        errMessage = defaultMsg;
    }
    return errMessage.replace('%target%', target);
}

function checkBrowserExistsWindows(browser, target) {
    const promise = new Promise((resolve, reject) => {
        // Windows displays a dialog if the browser is not installed. We'd prefer to avoid that.
        if (process.platform === 'win32') {
            if (target === 'edge') {
                edgeSupported().then(() => {
                    resolve();
                })
                    .catch(err => {
                        const errMessage = getErrorMessage(err, target, NOT_INSTALLED);
                        reject(errMessage);
                    });
            } else {
                browserInstalled(browser).then(() => {
                    resolve();
                })
                    .catch(err => {
                        const errMessage = getErrorMessage(err, target, NOT_INSTALLED);
                        reject(errMessage);
                    });
            }
        } else {
            resolve();
        }
    });
    return promise;
}

function edgeSupported() {
    const prom = new Promise((resolve, reject) => {
        child_process.exec('ver', (err, stdout, stderr) => {
            if (err || stderr) {
                reject(err || stderr);
            } else {
                const windowsVersion = stdout.match(/([0-9.])+/g)[0];
                if (parseInt(windowsVersion) < 10) {
                    reject(new Error('The browser target is not supported on this version of Windows: %target%'));
                } else {
                    resolve();
                }
            }
        });
    });
    return prom;
}

const regItemPattern = /\s*\([^)]+\)\s+(REG_SZ)\s+([^\s].*)\s*/;
function browserInstalled(browser) {
    // On Windows, the 'start' command searches the path then 'App Paths' in the registry.
    // We do the same here. Note that the start command uses the PATHEXT environment variable
    // for the list of extensions to use if no extension is provided. We simplify that to just '.EXE'
    // since that is what all the supported browsers use. Check path (simple but usually won't get a hit)

    const promise = new Promise((resolve, reject) => {
        if (which.sync(browser, { nothrow: true })) {
            return resolve();
        } else {
            const regQPre = 'reg QUERY "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\';
            const regQPost = '.EXE" /v ""';
            const regQuery = regQPre + browser.split(' ')[0] + regQPost;

            child_process.exec(regQuery, (err, stdout, stderr) => {
                if (err) {
                    // The registry key does not exist, which just means the app is not installed.
                    reject(err);
                } else {
                    const result = regItemPattern.exec(stdout);
                    if (fs.existsSync(trimRegPath(result[2]))) {
                        resolve();
                    } else {
                        // The default value is not a file that exists, which means the app is not installed.
                        reject(new Error(NOT_INSTALLED));
                    }
                }
            });
        }
    });
    return promise;
}

function trimRegPath(path) {
    // Trim quotes and whitespace
    return path.replace(/^[\s"]+|[\s"]+$/g, '');
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
};

module.exports.launchBrowser = launchBrowser;
