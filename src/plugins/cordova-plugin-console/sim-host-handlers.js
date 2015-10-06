// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {
    function logLevelHandler(successCallback, errorCallback, args) {
        var level = args[0];
        var message = args[1];
        switch (level) {
            case 'LOG': window.console.log(message); break;
            case 'ERROR': window.console.error('ERROR: ' + message); break;
            case 'WARN':  window.console.warn('WARN: '  + message); break;
            case 'INFO':  window.console.info('INFO: '  + message); break;
            case 'DEBUG': window.console.debug('DEBUG: ' + message); break;
        }
    }

    return {
        'Console': {
            'logLevel': logLevelHandler,
        }
    };
};
