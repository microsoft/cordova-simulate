// Copyright (c) Microsoft Corporation. All rights reserved.
 
// https://github.com/apache/cordova-plugin-globalization/

// this object fixes plugin loading on windows platform
module.exports = {
    GlobalizationProxy: {
        GlobalizationProxy: {
            setLocale: function () {}
        }
    }
};
