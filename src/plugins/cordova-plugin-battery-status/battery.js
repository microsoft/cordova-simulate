// Copyright (c) Microsoft Corporation. All rights reserved.

var db = require('db'),
    constants = require('sim-constants');

var _callbacks = {
        sendPluginResult: null,
        error: null
    },
    _batteryInfo = {};

var battery = {
    listenerEnabled: false,

    initialize: function (message) {
        var isPlugged = db.retrieve(constants.BATTERY_STATUS.IS_PLUGGED_KEY);
        _batteryInfo.level = db.retrieve(constants.BATTERY_STATUS.BATTERY_STATUS_KEY) || 100;
        _batteryInfo.isPlugged =  (isPlugged) ? (isPlugged === 'true') : true;
    },

    /**
     * Update the current battery level, save it and then notify using the callback passed on
     * Battery.start call.
     * @param {number} level
     */
    updateBatteryLevel: function (level) {
        _batteryInfo.level = level;

        db.save(constants.BATTERY_STATUS.BATTERY_STATUS_KEY, level);

        notifyBatteryStatusChanged();
    },

    /**
     * Update the current plugged state.
     * @param {boolean} isPlugged
     */
    updatePluggedStatus: function (isPlugged) {
        _batteryInfo.isPlugged = isPlugged;
        db.save(constants.BATTERY_STATUS.IS_PLUGGED_KEY, isPlugged);

        notifyBatteryStatusChanged();
    },

    /**
     * The exec call to Battery.start executes this function.
     * @param {function} success The function used to simulate the native call to CallbackContext.sendPluginResult.
     * @param {function} error The function used to simulate the native call to CallbackContext.error
     */
    onBatteryStart: function (success, error) {
        if (battery.listenerEnabled) {
            error('Battery listener already running.');
        }

        battery.listenerEnabled = true;
        _callbacks.sendPluginResult = success;
        _callbacks.error = error;

        notifyBatteryStatusChanged();
    },

    /**
     * The exec call to Battery.stop executes this function.
     */
    onBatteryStop: function () {
        battery.listenerEnabled = false;
        _callbacks.sendPluginResult = null;
        _callbacks.error = null;
    },

    /**
     * Get a battery info object that defines two properties: isPlugged and level.
     * @return {object}
     */
    getBatteryInfo: function () {
        return _batteryInfo;
    }
};

/**
 * Executes the success callback when listenerEnabled is true and a valid callback function
 * is registered. The current batteryInfo object is sent as the result.
 * This function simulates the native side and call to CallbackContext.sendPluginResult.
 */
function notifyBatteryStatusChanged() {
    if (battery.listenerEnabled && (typeof _callbacks.sendPluginResult === 'function')) {
        _callbacks.sendPluginResult(battery.getBatteryInfo());
    }
}

module.exports = battery;
