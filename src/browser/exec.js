/* globals Promise: true */

const child_process = require('child_process');

/**
 * Executes the command specified.
 * @param  {string} cmd Command to execute
 * @param  {[string]}  opt_cwd Current working directory
 * @return {Promise} a promise that either resolves with the stdout, or rejects with an error message and the stderr.
 */
module.exports = function (cmd, opt_cwd) {
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
