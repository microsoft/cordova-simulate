// Copyright (c) Microsoft Corporation. All rights reserved.

var dialog = require('dialog');
var telemetry = require('telemetry-helper');

var baseProps = {
    plugin: 'cordova-plugin-camera',
    panel: 'camera'
};

module.exports = function (messages) {
    var filenameInput,
        dialogFilenameInput,
        dialogImg,
        dialogSelectedFile,
        preSelectedFile;

    messages.register('takePicture', function (args, callback) {
        if (document.getElementById('camera-host').checked) {
            navigator.mediaDevices.getUserMedia({ video: true}).then(function(stream) {
                var video = document.getElementById('camera-stream');
                video.src = window.URL.createObjectURL(stream);
                video.play();
                video.onplaying = function() {
                    var canvas = document.getElementById('camera-host-canvas');
                    var width = video.videoWidth;
                    var height = video.videoHeight;

                    if (width && height) {
                        canvas.width = width;
                        canvas.height = height;
                    }

                    canvas.getContext('2d').drawImage(video, 0, 0, width, height);
                    video.pause();

                    getPictureFromCanvas(canvas, callback, args);
                };
            }).catch(function(err){
                window.alert('There was an error with accessing the camera stream: ' + err.name, err);
            });
        } else if (document.getElementById('camera-prompt').checked) {
            dialog.showDialog('camera-choose-image', function (msg) {
                if (msg === 'showing') {
                    // Not we use .onclick etc here rather than addEventListener() to ensure we replace any existing
                    // handler with one that uses the appropriate value of 'callback' from the current closure.
                    document.getElementById('camera-dialog-use-image').onclick = function () {
                        dialog.hideDialog('camera-choose-image');
                        if (dialogSelectedFile) {
                            getPicture(dialogSelectedFile, callback, args);
                        } else {
                            callback(null, null);
                        }
                    };
                    document.getElementById('camera-dialog-cancel').onclick = function () {
                        dialog.hideDialog('camera-choose-image');
                        callback(null, null);
                    };
                }
            });
        } else if (document.getElementById('camera-sample').checked) {
            var canvas = document.getElementById('camera-sample-canvas');
            if (canvas.getAttribute('done')) {
                getPictureFromCanvas(canvas, callback, args);
            }
        }
        else if (document.getElementById('camera-file').checked) {
            getPicture(preSelectedFile, callback, args);
        }
    });

    function getPictureFromCanvas(canvas, callback, args) {
        if (args && args[1] === 0) {
            /* Destination type is DATA_URL */
            callback(null, canvas.toDataURL('image/png'));
        } else {
            canvas.toBlob(function(blob) { 
                createArrayBuffer(blob, callback);
            }, 'image/png');
        }
    }

    function getPicture(file, callback, args) {
        if (args && args[1] === 0) {
            /* Destination type is DATA_URL */
            createDataUrl(file, callback);
        } else {
            createArrayBuffer(file, callback);
        }
    }

    function createArrayBuffer(blob, callback) {
        var reader = new FileReader();
        reader.onloadend = function () {
            callback(reader.error, { data: reader.result, type: blob.type });
        };
        reader.readAsArrayBuffer(blob);
    }

    function createDataUrl(blob, callback) {
        var reader = new FileReader();
        reader.onloadend = function () {
            var imageData = reader.result;
            if (imageData) {
                imageData = imageData.substr(imageData.indexOf(',') + 1);
            }
            callback(reader.error, imageData);
        };
        reader.readAsDataURL(blob);
    }

    return {
        initialize: function () {
            filenameInput = document.getElementById('camera-filename');
            dialogFilenameInput = document.getElementById('camera-dialog-filename');
            dialogImg = document.getElementById('camera-dialog-image');
            var panelImg = document.getElementById('camera-img');

            // Setup handlers for choosing an image in the panel
            filenameInput.accept = 'image/*';
            document.getElementById('camera-choose-filename').addEventListener('click', function () {
                telemetry.sendUITelemetry(Object.assign({}, baseProps, { control: 'camera-choose-filename' }));
                filenameInput.input.click();
            });
            
            document.getElementById('camera-make-sample').addEventListener('click', function () {
                navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
                    var video = document.getElementById('camera-stream');
                    video.src = window.URL.createObjectURL(stream);
                    video.play();
                    video.onplaying = function() {
                        var canvas = document.getElementById('camera-sample-canvas');
                        var width = video.videoWidth;
                        var height = video.videoHeight;

                        if (width && height) {
                            canvas.width = width;
                            canvas.height = height;
                        }

                        canvas.getContext('2d').drawImage(video, 0, 0, width, height);
                        canvas.setAttribute('done', true);
                        video.pause();
                        
                        // preview
                        var data = canvas.toDataURL('image/png');
                        var panelImg = document.getElementById('camera-img');
                        panelImg.setAttribute('src', data);
                        panelImg.style.display = 'block';
                    };
                }).catch(function(err){
                    window.alert('There was an error with accessing the camera stream: ' + err.name, err);
                });
            });

            filenameInput.addEventListener('change', function () {
                if (filenameInput.files[0]) {
                    preSelectedFile = filenameInput.files[0];
                    panelImg.src = URL.createObjectURL(preSelectedFile);
                    panelImg.style.display = '';
                }
            });

            // Setup handlers for choosing an image in the dialog
            dialogFilenameInput.accept = 'image/*';
            document.getElementById('camera-dialog-choose-filename').addEventListener('click', function () {
                dialogFilenameInput.input.click();
            });

            dialogFilenameInput.addEventListener('change', function () {
                if (dialogFilenameInput.files[0]) {
                    dialogSelectedFile = dialogFilenameInput.files[0];

                    dialogImg.src = URL.createObjectURL(dialogSelectedFile);
                    dialogImg.style.display = '';
                    document.getElementById('camera-dialog-use-image').style.display = '';
                }
            });

            var previousSelection = 'camera-prompt';
            function handleRadioClick(radioName) {
                if (radioName !== previousSelection) {
                    previousSelection = radioName;
                    telemetry.sendUITelemetry(Object.assign({}, baseProps, { control: radioName }));
                }
            }

            document.getElementById('camera-prompt').onclick = handleRadioClick.bind(this, 'camera-prompt');
            document.getElementById('camera-file').onclick = handleRadioClick.bind(this, 'camera-file');
            document.getElementById('camera-host').onclick = handleRadioClick.bind(this, 'camera-host');
            document.getElementById('camera-sample').onclick = handleRadioClick.bind(this, 'camera-sample');

            // hide actions if they are not supported by the browser (IE 11, Safari, Opera mini)
            if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                document.getElementById('camera-host').style.display = 'none';
                document.getElementById('camera-sample-row').style.display = 'none';
            }
        }
    };
};
