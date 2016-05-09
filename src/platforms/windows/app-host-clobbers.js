// Copyright (c) Microsoft Corporation. All rights reserved.

/*
 * Windows API definition taken from:
 * - https://msdn.microsoft.com/library/windows/apps/windows.networking.connectivity.networkconnectivitylevel.aspx
 */

module.exports = {
    // Сlobbing WinJS.Application.addEventListener
    // for proper cordova-plugin-test-framework initialization
    // on Windows platform
    WinJS: {
        Application: {
            addEventListener: function () {}
        }
    },
    Windows: {
        Networking: {
            Connectivity: {
                NetworkConnectivityLevel: {
                    none: 0,
                    localAccess: 1,
                    constrainedInternetAccess: 2,
                    internetAccess: 3
                }
            }
        }
    }
};
