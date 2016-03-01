// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path'),
    replaceStream = require('replacestream'),
    cordovaServe = require('cordova-serve'),
    send = require('send'),
    url = require('url'),
    config = require('./config'),
    dirs = require('./dirs'),
    plugins = require('./plugins'),
    prepare = require('./prepare'),
    simFiles = require('./sim-files'),
    log = require('./log');

var pluginSimulationFiles = require('./plugin-files');

function attach(app) {
    app.get('/simulator/', streamSimHostHtml);
    app.get('/simulator/*.html', streamSimHostHtml);
    app.get('/', streamAppHostHtml);
    app.get('/*.html', streamAppHostHtml);
    app.get('/simulator/app-host.js', function (request, response) {
        sendHostJsFile(response, 'app-host');
    });
    app.get('/simulator/sim-host.js', function (request, response) {
        sendHostJsFile(response, 'sim-host');
    });
    app.use(plugins.getRouter());
    app.use('/simulator', cordovaServe.static(dirs.hostRoot['sim-host']));
    app.use('/simulator/thirdparty', cordovaServe.static(dirs.thirdParty));

}

function sendHostJsFile(response, hostType) {
    var hostJsFile = simFiles.getHostJsFile(hostType);
    if (!hostJsFile) {
        throw new Error('Path to ' + hostType + '.js has not been set.');
    }
    response.sendFile(hostJsFile);
}

function streamAppHostHtml(request, response) {
    var filePath = path.join(config.platformRoot, url.parse(request.url).pathname);

    if (request.query && request.query['cdvsim-enabled'] === 'false') {
        response.sendFile(filePath);
        return;
    }

    // Always prepare before serving up app HTML file, so app is up-to-date,
    // then create the app-host.js (if it is out-of-date) so it is ready when it is requested.
    prepare.prepare().then(function () {
        return simFiles.createAppHostJsFile();
    }).then(function (pluginList) {
        // Sim host will need to be refreshed if the plugin list has changed.
        simFiles.validateSimHostPlugins(pluginList);

        // Inject plugin simulation app-host <script> references into *.html
        log.log('Injecting app-host into ' + filePath);
        var scriptSources = [
            '/simulator/thirdparty/socket.io-1.2.0.js',
            '/simulator/app-host.js'
        ];
        var scriptTags = scriptSources.map(function (scriptSource) {
            return '<script src="' + scriptSource + '"></script>';
        }).join('');

        // Note we replace "default-src 'self'" with "default-src 'self' ws:" (in Content Security Policy) so that
        // websocket connections are allowed (this relies on a custom version of send that supports a 'transform' option).
        send(request, filePath, {
            transform: function (stream) {
                return stream
                    .pipe(replaceStream(/<\s*head\s*>/, '<head>' + scriptTags))
                    .pipe(replaceStream('default-src \'self\'', 'default-src \'self\' ws: blob:'));
            }
        }).pipe(response);
    }).done();
}

function streamSimHostHtml(request, response) {
    // If we haven't ever prepared, do so before we try to generate sim-host, so we know our list of plugins is up-to-date.
    // Then create sim-host.js (if it is out-of-date) so it is ready when it is requested.
    prepare.prepare().then(function () {
        return simFiles.createSimHostJsFile();
    }).then(function () {
        // Inject references to simulation HTML files
        var panelsHtmlBasename = pluginSimulationFiles['sim-host']['panels'];
        var dialogsHtmlBasename = pluginSimulationFiles['sim-host']['dialogs'];
        var panelsHtml = [];
        var dialogsHtml = [];

        var pluginList = plugins.getPlugins();

        Object.keys(pluginList).forEach(function (pluginId) {
            var pluginPath = pluginList[pluginId];
            if (pluginPath) {
                var panelsHtmlFile = path.join(pluginPath, panelsHtmlBasename);
                if (fs.existsSync(panelsHtmlFile)) {
                    panelsHtml.push(processPluginHtml(fs.readFileSync(panelsHtmlFile, 'utf8'), pluginId));
                }

                var dialogsHtmlFile = path.join(pluginPath, dialogsHtmlBasename);
                if (fs.existsSync(dialogsHtmlFile)) {
                    dialogsHtml.push(processPluginHtml(fs.readFileSync(dialogsHtmlFile, 'utf8'), pluginId));
                }
            }
        });

        // Note that this relies on a custom version of send that supports a 'transform' option.
        send(request, path.join(dirs.hostRoot['sim-host'], 'sim-host.html'), {
            transform: function (stream) {
                return stream
                    .pipe(replaceStream('<!-- PANELS -->', panelsHtml.join('\n')))
                    .pipe(replaceStream('<!-- DIALOGS -->', dialogsHtml.join('\n')));
            }
        }).pipe(response);
    }).done();
}

function processPluginHtml(html, pluginId) {
    return [/<script[^>]*src\s*=\s*"([^"]*)"[^>]*>/g, /<link[^>]*href\s*=\s*"([^"]*)"[^>]*>/g].reduce(function (result, regex) {
        // Ensures plugin path is prefixed to source of any script and link tags
        return result.replace(regex, function (match, p1) {
            return match.replace(p1, 'plugin/' + pluginId + '/' + p1.trim());
        });
    }, html).replace(/<!\-\-(.|\s)*?\-\->(\s)*/g, function () {
        // Remove comments
        return '';
    });
}

function stop() {
    plugins.clearPlugins();
    simFiles.clearSimFiles();
    config.newInstance();

    if (config.server) {
        config.server.close(function (error) {
            if (error) {
                log.log(error);
            }
        })
    }
}

module.exports = {
    attach: attach,
    stop: stop
};
