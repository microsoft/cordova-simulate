// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    'CoreAndroid': {
        'backHistory': function (success, fail, service, action, args) {
            window.history.go(-1);
            success && success();
        }
    }
};
