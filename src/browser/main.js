const chalk = require('chalk');
const compression = require('compression');
const express = require('express');

module.exports = function () {
    return new CordovaServe();
};

function CordovaServe () {
    this.app = express();

    // Attach this before anything else to provide status output
    this.app.use((req, res, next) => {
        res.on('finish', function () {
            const color = this.statusCode === 404 ? chalk.red : chalk.green;
            let msg = `${color(this.statusCode)} ${this.req.originalUrl}`;
            const encoding = this.getHeader('content-encoding');
            if (encoding) {
                msg += chalk.gray(` (${encoding})`);
            }
            require('./server').log(msg);
        });
        next();
    });

    // Turn on compression
    this.app.use(compression());

    this.servePlatform = require('./platform');
    this.launchServer = require('./server');
    this.launchBrowser = require('./browser');
}

module.exports.launchBrowser = require('./browser');

// Expose some useful express statics
module.exports.Router = express.Router;
module.exports.static = express.static;
