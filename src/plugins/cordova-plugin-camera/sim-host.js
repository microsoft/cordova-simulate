// Copyright (c) Microsoft Corporation. All rights reserved.

var dialog = require('dialog');

module.exports = function (messages) {
    var filenameInput, dialogFilenameInput, dialogImg;

    messages.register('takePicture', function (args, callback) {
        if (document.getElementById('camera-host').checked) {
            window.alert('Not supported');
        } else if (document.getElementById('camera-prompt').checked) {
            dialog.showDialog('camera-choose-image', function (msg) {
                if (msg === 'showing') {
                    // Not we use .onclick etc here rather than addEventListener() to ensure we replace any existing
                    // handler with one that uses the appropriate value of 'callback' from the current closure.
                    document.getElementById('camera-dialog-use-image').onclick = function () {
                        dialog.hideDialog('camera-choose-image');
                        createArrayBuffer(dialogFilenameInput, callback);
                    };
                    document.getElementById('camera-dialog-cancel').onclick = function () {
                        dialog.hideDialog('camera-choose-image');
                        callback(null, null);
                    };
                }
            });
        } else if (document.getElementById('camera-sample').checked) {
            window.alert('Not supported');
        } else if (document.getElementById('camera-file').checked) {
            createArrayBuffer(filenameInput, callback);
        }
    });

    function createArrayBuffer(input, callback) {
        var blob = input.files[0];
        var reader = new FileReader();
        reader.onloadend = function () {
            callback(reader.error, {data: reader.result, type: blob.type});
        };
        reader.readAsArrayBuffer(blob);
    }

    return {
        initialize: function () {
            filenameInput = document.getElementById('camera-filename');
            dialogFilenameInput = document.getElementById('camera-dialog-filename');
            dialogImg = document.getElementById('camera-dialog-image');
            var panelImg = document.getElementById('camera-img');

            // Setup handlers for choosing an image in the panel
            document.getElementById('camera-choose-filename').addEventListener('click', function () {
                filenameInput.input.click();
            });

            filenameInput.addEventListener('change', function () {
                panelImg.src = URL.createObjectURL(filenameInput.files[0]);
                panelImg.style.display = '';
            });

            // Setup handlers for choosing an image in the dialog
            document.getElementById('camera-dialog-choose-filename').addEventListener('click', function () {
                dialogFilenameInput.input.click();
            });

            dialogFilenameInput.addEventListener('change', function () {
                dialogImg.src = URL.createObjectURL(dialogFilenameInput.files[0]);
                dialogImg.style.display = '';
                document.getElementById('camera-dialog-use-image').style.display = '';
            });
        }
    };
};
