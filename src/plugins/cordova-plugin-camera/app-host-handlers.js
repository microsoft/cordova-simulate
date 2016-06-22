// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {
    return  {
        Camera: {
            takePicture: function (success, fail, args) {
                messages.call('takePicture', args).then(function (result) {
                    if (args && args[1] === 0) {
                        /* Destination type is DATA_URL */
                        success(result);
                    } else {
                        // 'result' should be {data: <ArrayBuffer>, type: <mimeType>}, from which we'll create a blob
                        var blob = new Blob([result.data], { type: result.type });
                        success(URL.createObjectURL(blob));
                    }
                }, function (error) {
                    fail(error);
                });
            }
        }
    };
};
