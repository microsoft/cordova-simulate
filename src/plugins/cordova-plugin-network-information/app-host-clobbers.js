// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = {
    Windows: {
        Networking: {
            Connectivity: {
                NetworkInformation: {
                    getInternetConnectionProfile: function () {
                        return {
                            getNetworkConnectivityLevel: function () {
                                // defined in platforms/windows/app-host-clobbers.js
                                return Windows.Networking.Connectivity.NetworkConnectivityLevel.internetAccess;
                            },
                            networkAdapter: {
                                ianaInterfaceType: 71
                            }
                        };
                    }
                },
                NetworkCostType: {},
                NetworkAuthenticationType: {},
                NetworkEncryptionType: {}
            }
        }
    }
};
