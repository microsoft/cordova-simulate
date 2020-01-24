/* eslint-env es6 */
var fs = require('fs');
var path = require('path');

// iife to allow plugin gathering when module is required
// Intentional use of synchronous fs calls to stop plugins from being exported until all plugins are checked
var plugins = {};
(function () {
    var cordovaPlugins = fs.readdirSync(path.join(process.cwd(), 'plugins'));
    for(var cordovaPlugin of cordovaPlugins) {
        try {
            var temp = require(path.join(process.cwd(), 'plugins', cordovaPlugin, 'src/simulation/simulate_gap.js'));
            var services = Object.keys(temp);
            for(var service of services) {
                plugins[service] = temp[service];
            }
        // eslint-disable-next-line no-empty
        } catch(e) { } // Just catches plugins that don't have a simulate_gap file
    }
})();

module.exports = plugins;