// Copyright (c) Microsoft Corporation. All rights reserved.

var path = require('path'),
    config = require('./config');

var rootPath = path.resolve(__dirname, '..');

module.exports.root = rootPath;
module.exports.platforms = path.join(rootPath, 'platforms');
module.exports.plugins = path.join(rootPath, 'plugins');
module.exports.thirdParty = path.join(rootPath, 'third-party');

module.exports.modules = {
    'common': path.join(rootPath, 'modules'),
    'sim-host': path.join(rootPath, 'modules', 'sim-host')
};

module.exports.hostRoot = {
    'app-host':  path.join(rootPath, 'app-host')
};
Object.defineProperty(module.exports.hostRoot, 'sim-host', {
    get: function () {
        // Get dynamically so simHostOptions is initialized
        return config.simHostOptions.simHostRoot;
    }
});

Object.defineProperty(module.exports, 'node_modules', {
    get: function () {
        // Get dynamically so simHostOptions is initialized
        return [path.resolve(rootPath, '..', 'node_modules'), config.simHostOptions.node_modules];
    }
});
