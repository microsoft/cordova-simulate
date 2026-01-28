// Copyright (c) Microsoft Corporation. All rights reserved.

var dialog = require('dialog');
var savedSims = require('./saved-sims');
var telemetry = require('telemetry-helper');

// Handle any calls not handled by anything else...
module.exports = {
    '*': {
        '*': function (success, fail, service, action, args) {
            // If there is no success or fail method provided, then there is no point in us trying to handle it, so we
            // don't.
            if (!success && !fail) {
                return;
            }

            // If we have a saved sim for this service.action, use that
            if (handleSavedSim(success, fail, service, action)) {
                return;
            }

            // Otherwise show the dialog
            dialog.showDialog('exec-dialog', function (msg) {
                if (msg === 'query-show') {
                    // Display of the dialog was delayed for some reason. Check if in the meantime we have a saved value
                    // for this call.
                    return !handleSavedSim(success, fail, service, action);
                } else if (msg === 'showing') {
                    // Prepare the dialog for showing
                    var successButton = document.getElementById('exec-success');
                    var failureButton = document.getElementById('exec-failure');
                    var resultField = document.getElementById('exec-response');
                    var errorDisplay = document.getElementById('exec-error');

                    errorDisplay.style.display = 'none';
                    document.getElementById('exec-service').textContent = service;
                    document.getElementById('exec-action').textContent = action;
                    document.getElementById('exec-args').textContent = (args || []).map(JSON.stringify).join(', ');

                     
                    function handleSuccess() {
                        exec(success, true);
                    }

                    function handleFailure() {
                        exec(fail);
                    }

                    function exec(func, isSuccess) {
                        var result = resultField.value;
                        var shouldPersist = document.getElementById('exec-persist').checked;

                        try {
                            result = result && JSON.parse(result);
                        } catch (e) {
                            document.getElementById('exec-parse-error').textContent = e.toString();
                            errorDisplay.style.display = '';
                            return;
                        }

                        dialog.hideDialog('exec-dialog');

                        if (shouldPersist) {
                            savedSims.addSim({ service: service, action: action, args: args, value: result, success: isSuccess });
                        }

                        sendExecUnhandledTelemetry(service, action, false, isSuccess, resultHasValue(result), shouldPersist);
                        func.apply(null, result ? [result] : []);
                    }
                     

                    // Do this each time to capture the values from the current closure. Also, use this approach rather than
                    // addEventListener(), as it can prove difficult to remove the event listener.
                    successButton.onclick = handleSuccess;
                    failureButton.onclick = handleFailure;

                    resultField.value = '';
                }
            });
        }
    }
};

function handleSavedSim(success, fail, service, action) {
    var savedSim = savedSims.findSavedSim(service, action);
    if (savedSim) {
        var isSuccess = !!savedSim.success;
        sendExecUnhandledTelemetry(service, action, true, isSuccess, resultHasValue(savedSim.value));

        if (isSuccess) {
            success(savedSim.value);
        } else {
            fail(savedSim.value);
        }
        return true;
    }
    return false;
}

/**
 * Sends an 'exec-unhandled' telemetry event to the server.
 * 
 * @param {string} service The name of the plugin's service.
 * @param {string} action The name of the plugin's action.
 * @param {boolean} hasPersisted Whether or not the exec call already had a persiste result (no dialog popup was shown to the user).
 * @param {boolean} isSuccess Whether or not the result is a success (as in, the plugin action's success callback was used).
 * @param {boolean} hasResult Whether or not the result contains a value (as opposed to being empty / the default JSON object {}).
 * @param {boolean=} saveResult Whether the user chose to persist the result. This is ignored if hasPersisted is true, because in that case the user wasn't presented the dialog popup.
 */
function sendExecUnhandledTelemetry(service, action, hasPersisted, isSuccess, hasResult, saveResult) {
    var props = {
        'service': service,
        'action': action,
        'has-persisted-result': hasPersisted,
        'is-success': isSuccess,
        'has-result-value': hasResult
    };

    if (!hasPersisted) {
        props['save-result'] = !!saveResult;
    }

    telemetry.sendClientTelemetry('exec-unhandled', props);
}

/**
 * Determines whether the user typed something in the unhandled exec popup.
 * 
 * @param {any} result The content of the text entry.
 * @returns {boolean} Whether the user entered a value.
 */
function resultHasValue(result) {
    return typeof result !== 'undefined' && result !== '';
}
