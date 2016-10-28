// Copyright (c) Microsoft Corporation. All rights reserved.

// This module manages the queuing of dialogs. The simulation host must register dialogs (by adding them to
// pluginDialogs) and handle the actual showing/hiding when requested (via hide() and show() methods attach to
// the registered dialog object).

var pluginDialogs = {};

var currentDialogId = null;
var dialogQueue = [];

module.exports.pluginDialogs = pluginDialogs;

var panelsDisabled = false;
var activeElement = null;

function showDialog(dialogId, cb) {
    var dialog = pluginDialogs[dialogId];
    if (!dialog) {
        throw 'No dialog defined with id ' + dialogId;
    }

    // If a dialog is currently showing, queue this one to show later
    if (currentDialogId) {
        dialogQueue.push({id: dialogId, callback: cb});
        return;
    }

    // Notify callback we're about to show
    cb && cb('showing');

    currentDialogId = dialogId;

    // Disable the panels if they're not already
    if (!panelsDisabled) {
        activeElement = document.activeElement;
        getPanels().forEach(function (panel) {
            panel.enabled = false;
        });
        panelsDisabled = true;
    }

    dialog.show();

    // Notify callback we're shown
    cb && cb('shown');
}
module.exports.showDialog = showDialog;

function hideDialog(dialogId) {
    if (!dialogId) {
        dialogId = currentDialogId;
        if (!dialogId) {
            throw 'Trying to hide dialog when none is showing.';
        }
    } else {
        if (dialogId !== currentDialogId) {
            throw 'Trying to hide a dialog that isn\'t currently showing: ' + dialogId;
        }
    }

    var dialog = pluginDialogs[dialogId];
    if (!dialog) {
        throw 'No dialog defined with id ' + dialogId;
    }

    currentDialogId = null;
    dialog.hide();

    // After a timeout, see if there are more dialogs to show
    window.setTimeout(function () {
        if (currentDialogId) {
            return;
        }

        var dialogInfo = findNextDialog();
        if (dialogInfo) {
            showDialog(dialogInfo.id, dialogInfo.callback);
        } else {
            // No dialog to show? Re-enable the panels
            getPanels().forEach(function (panel) {
                panel.enabled = true;
            });

            if (activeElement) {
                activeElement.focus();
                activeElement = null;
            }

            panelsDisabled = false;
        }
    }, 0);
}
module.exports.hideDialog = hideDialog;

function getPanels() {
    return Array.prototype.slice.call(document.querySelectorAll('body /deep/ cordova-panel'));
}

function findNextDialog() {
    while (dialogQueue.length) {
        var dialogInfo = dialogQueue.shift();
        var cb = dialogInfo.callback;
        // If there's a callback, it must explicitly return 'false' (not a falsy value) in response to 'query-show' to
        // prevent the dialog from showing.
        if (!cb || cb('query-show') !== false) {
            return dialogInfo;
        }
    }
    return null;
}
