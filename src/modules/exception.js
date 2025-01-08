// Copyright (c) Microsoft Corporation. All rights reserved.
// Based in part on code from Apache Ripple, https://github.com/apache/incubator-ripple

function _getStack(caller, depth) {
    var stack = '',
        count = 0;

    try {
        /*jshint noarg:false*/ // THIS SHOULD NOT be a common occurrence..

        while (count <= depth && caller) {
            stack += 'function: ' + caller.toString().match(/function\s?(.*)\{/)[1] + '\n';
            caller = caller.arguments.callee.caller;
            count++;
        }
    } catch (e) {
        stack = 'failed to determine stack trace (' + (e.name || e.type) + ' :: ' + e.message + ')';
    }

    return stack;
}

module.exports = {

    types: {
        Application: 'Application',
        ArgumentLength: 'ArgumentLength',
        ArgumentType: 'ArgumentType',
        Argument: 'Argument',
        NotificationType: 'NotificationType',
        NotificationStateType: 'NotificationStateType',
        DomObjectNotFound: 'DomObjectNotFound',
        LayoutType: 'LayoutType',
        DeviceNotFound: 'DeviceNotFound',
        tinyHipposMaskedException: 'tinyHipposMaskedException',
        Geo: 'Geo',
        Accelerometer: 'Accelerometer',
        MethodNotImplemented: 'MethodNotImplemented',
        InvalidState: 'InvalidState',
        ApplicationState: 'ApplicationState'
    },

    handle: function handle(exception, reThrow) {
        reThrow = reThrow || false;

        var eMsg = exception.message || 'exception caught!',
            msg = eMsg + '\n\n' + (exception.stack || '*no stack provided*') + '\n\n';

        console.error(msg);

        if (reThrow) {
            throw exception;
        }
    },

    raise: function raise(caller, exceptionType, message, customExceptionObject) {
        var obj = customExceptionObject || {
            type: '',
            message: '',

            toString: function () {
                var result = this.name + ': \'' + this.message + '\'';

                if (this.stack) {
                    result += '\n' + this.stack;
                }
                return result;
            }
        };

        message = message || '';

        obj.name = exceptionType;
        obj.type = exceptionType;
        // TODO: include the exception objects original message if exists
        obj.message = message;
        obj.stack = _getStack(caller, 5);

        throw obj;
    }
};
