// Copyright (c) Microsoft Corporation. All rights reserved.

/*
 * Windows API definition taken from:
 * - https://msdn.microsoft.com/library/windows/apps/windows.networking.connectivity.networkconnectivitylevel.aspx
 */

module.exports = {
    WinJS: {
        Application: {
            addEventListener: function () { }
        },
        Utilities: {
            // While simulating Windows platform, we don't currently provide
            // a way to specify Table/PC vs Phone simulation so we always
            // retun false here; this may be changed in the future.
            isPhone: false
        }
    },
    Windows: {
        ApplicationModel: {
            Contacts: {}
        },
        Devices: {
            Sensors: {
                Accelerometer: {
                    getDefault: function () { return true; }
                }
            }
        },
        Networking: {
            Connectivity: {
                NetworkConnectivityLevel: {
                    none: 0,
                    localAccess: 1,
                    constrainedInternetAccess: 2,
                    internetAccess: 3
                },
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
        },
        Storage: {
            ApplicationData: {
                current: {
                    localFolder: {
                        path: ''
                    },
                    temporaryFolder: {
                        path: ''
                    }
                }
            },
            CreationCollisionOption: {
                generateUniqueName: function () { }
            },
            FileIO: {},
            Pickers: {
                PickerLocationId: {}
            },
            StorageFolder: {
                getFolderFromPathAsync: function () { }
            },
            StorageFile: {
                getFileFromPathAsync: function () { }
            }

        },
        Media: {
            Capture: {
                MediaStreamType: {}
            },
            Devices: {
                MediaDevice: {
                    // Used in Media autotests to detect whether audio is supported
                    getDefaultAudioRenderId: function () {
                        return true;
                    }
                },
                AudioDeviceRole: {
                    default: {}
                }
            }
        },
        UI: {
            WebUI: {
                WebUIApplication: {}
            }
        }
    }
};
