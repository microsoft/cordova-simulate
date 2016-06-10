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
                                // FIXME: see issue #56. lint suppression should
                                // be removed when it's fixed.
                                // eslint-disable-next-line no-undef
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
