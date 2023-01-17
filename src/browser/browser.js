/* globals Promise: true */

const child_process = require('child_process');
const fs = require('fs');
const open = require('open');
const which = require('which');
const exec = require('./exec');

const NOT_INSTALLED = 'The browser target is not installed: %target%';
const NOT_SUPPORTED = 'The browser target is not supported: %target%';

/**
 * Launches the specified browser with the given URL.
 * Based on https://github.com/apache/cordova-serve and https://github.com/domenic/opener
 */
module.exports = function (opts) {
    opts = opts || {};
    let target = opts.target || 'default';
    const url = opts.url || '';

    target = target.toLowerCase();
    if (target === 'default') {
        open(url);
        return Promise.resolve();
    } else {
        return getBrowser(target, opts.dataDir).then(browser => {
            let args;
            let urlAdded = false;

            switch (process.platform) {
                case 'darwin':
                    args = ['open'];
                    if (target === 'chrome') {
                        args.push('-n');
                    }
                    args.push('-a', browser);
                    break;
                case 'win32':
                    if (target === 'edge') {
                        browser += `:${url}`;
                        urlAdded = true;
                    }

                    args = ['cmd /c start ""', browser];
                    break;
                case 'linux':
                    args = [browser];
                    break;
            }

            if (!urlAdded) {
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
};

function getBrowser (target, dataDir) {
    dataDir = dataDir || 'temp_chrome_user_data_dir_for_cordova';

    const chromeArgs = ` --user-data-dir=/tmp/${dataDir}`;
    const browsers = {
        win32: {
            chrome: `chrome --user-data-dir=%TEMP%\\${dataDir}`,
            edge: 'microsoft-edge',
            firefox: 'firefox'
        },
        darwin: {
            chrome: `"Google Chrome" --args${chromeArgs}`,
            edge: 'microsoft-edge',
            safari: 'safari',
            firefox: 'firefox'
        },
        linux: {
            chrome: `google-chrome${chromeArgs}`,
            edge: 'microsoft-edge',
            firefox: 'firefox'
        }
    };

    if (target in browsers[process.platform]) {
        const browser = browsers[process.platform][target];
        return checkBrowserExistsWindows(browser, target).then(() => browser);
    } else {
        return Promise.reject(NOT_SUPPORTED.replace('%target%', target));
    }
}

function getErrorMessage (err, target, defaultMsg) {
    let errMessage;
    if (err) {
        errMessage = err.toString();
    } else {
        errMessage = defaultMsg;
    }
    return errMessage.replace('%target%', target);
}

function checkBrowserExistsWindows (browser, target) {
    const promise = new Promise((resolve, reject) => {
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

function edgeSupported () {
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
function browserInstalled (browser) {
    const promise = new Promise((resolve, reject) => {
        if (which.sync(browser, { nothrow: true })) {
            return resolve();
        } else {
            const regQPre = 'reg QUERY "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\';
            const regQPost = '.EXE" /v ""';
            const regQuery = regQPre + browser.split(' ')[0] + regQPost;

            child_process.exec(regQuery, (err, stdout) => {
                if (err) {
                    reject(err);
                } else {
                    const result = regItemPattern.exec(stdout);
                    if (fs.existsSync(trimRegPath(result[2]))) {
                        resolve();
                    } else {
                        reject(new Error(NOT_INSTALLED));
                    }
                }
            });
        }
    });
    return promise;
}

function trimRegPath (path) {
    return path.replace(/^[\s"]+|[\s"]+$/g, '');
}
