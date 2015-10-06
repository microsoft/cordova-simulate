// Copyright (c) Microsoft Corporation. All rights reserved.

var savedSims = require('./saved-sims');
var dialog = require('dialog');

// Handle any calls not handled by anything else...
module.exports = {
    '*': {
        '*': function (success, fail, service, action, args) {
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
                } else  if (msg === 'showing') {
                    // Prepare the dialog for showing
                    var successButton = document.getElementById('exec-success');
                    var failureButton = document.getElementById('exec-failure');
                    var resultField = document.getElementById('exec-response');
                    var errorDisplay = document.getElementById('exec-error');

                    errorDisplay.style.display = 'none';
                    document.getElementById('exec-service').textContent = service;
                    document.getElementById('exec-action').textContent = action;

                    function handleSuccess() {
                        exec(success, true);
                    }

                    function handleFailure() {
                        exec(fail);
                    }

                    function exec(func, isSuccess) {
                        var result = resultField.value;

                        try {
                            result = result && JSON.parse(result);
                        } catch (e) {
                            document.getElementById('exec-parse-error').textContent = e.toString();
                            errorDisplay.style.display = '';
                            return;
                        }

                        dialog.hideDialog('exec-dialog');

                        if (document.getElementById('exec-persist').checked) {
                            savedSims.addSim({service: service, action: action, args: args, value: result, success: isSuccess});
                        }

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
        if (savedSim.success) {
            success(savedSim.value);
        } else {
            fail(savedSim.value);
        }
        return true;
    }
    return false;
}
