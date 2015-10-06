// Copyright (c) Microsoft Corporation. All rights reserved.

// https://github.com/apache/cordova-plugin-dialogs/

module.exports = function (messages) {
    messages.register('alert', function (event, callback) {
        var args = event;
        var title = args[1];
        var text = args[0];
        var buttonName = args[2];
        createDialog(title, text, [buttonName], false, null, callback);
    });

    messages.register('confirm', function (event, callback) {
        var args = event;
        var title = args[1];
        var text = args[0];
        var buttons = args[2];
        createDialog(title, text, buttons, false, null, callback);
    });

    messages.register('prompt', function (event, callback) {
        var args = event;
        var title = args[1];
        var text = args[0];
        var buttons = args[2];
        var defaultText = args[3];
        createDialog(title, text, buttons, true, defaultText, callback);
    });

    messages.register('beep', function (event, callback) {
        var times = event;
        for (var i = 0; i < times; i++) {
            // 1700ms below is the beep sound duration
            setTimeout(makeBeep, 1700 * i);
        }
        // call callback when beep(s) is done
        setTimeout(callback, 1700 * times);
    });

    function makeBeep() {
        var audio = document.createElement('audio');
        audio.src = 'data:audio/wav;base64,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' +
            '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';
        audio.play();
    } 

    function createDialog (title, message, buttons, addInput, defaultText, callback) {
        var dlgWrap = document.createElement('div');
        dlgWrap.style.position = 'absolute';
        dlgWrap.style.width = '100%';
        dlgWrap.style.height = '100%';
        dlgWrap.style.backgroundColor = 'rgba(0,0,0,0.25)';
        dlgWrap.style.zIndex = '100000';
        dlgWrap.style.top = '0';
        dlgWrap.style.left = '0';
        dlgWrap.style.margin = '0';
        dlgWrap.style.padding = '0';

        var dlg = document.createElement('div');
        dlg.style.height = 'auto';
        dlg.style.overflow = 'auto';
        dlg.style.backgroundColor = 'white';
        dlg.style.position = 'relative';
        dlg.style.lineHeight = '2';

        dlg.style.top = '50%'; // center vertically
        dlg.style.transform = 'translateY(-50%)';
        dlg.style.margin = '0px 30%';
        dlg.style.padding = '10px';
        dlg.style.boxShadow = '2px 2px 5px 1px rgba(0, 0, 0, 0.2)';
        dlg.style.borderRadius = '2px';

        var titleStyle = 'border-top-left-radius: 2px; border-top-right-radius: 2px; position: relative; background-color: #03a9f4; color: #fff; font-size: 16px; padding: 7px 10px; height: 24px; text-transform: none; font-family: \'Helvetica Neue\', \'Roboto\', \'Segoe UI\', \'sans-serif\'; line-height: 24px;';
        // needed to remove white line at the top of the title container
        if (addInput) {
            titleStyle += 'margin: -11px -10px -10px;';
        } else {
            titleStyle += 'margin: -10px;';
        }

        // dialog layout template
        var dlgHtml = '<section id="lbl-title" style="' + titleStyle + '"></section>' +
        '<section id="lbl-message" style="color: #3c8b9e; text-transform: none; font-size: 14px; margin: 20px 0 0 0; font-family: \'Helvetica Neue\', \'Roboto\', \'Segoe UI\', \'sans-serif\';"></section>';

        if (addInput) {
            dlgHtml += '<input id="prompt-input" style="width: 97.5%; border: 1px solid #d3d3d3; font-weight: normal; color: #555; padding: 1%;"/>';
        }
        dlg.innerHTML = dlgHtml;

        dlg.querySelector('#lbl-title').appendChild(document.createTextNode(title));
        dlg.querySelector('#lbl-message').appendChild(document.createTextNode(message));
        if (addInput) {
            dlg.querySelector('#prompt-input').setAttribute('placeholder', defaultText);
        }

        function makeButtonCallback(idx) {
            return function () {
                var value;
                if (addInput) {
                    value = dlg.querySelector('#prompt-input').value;
                }
                
                dlgWrap.parentNode.removeChild(dlgWrap);

                if (callback) {
                    if (addInput) {
                        callback(false, { input1: value, buttonIndex: idx });
                    } else {
                        callback(false, idx);
                    }
                }
            };
        }

        function addButton(idx, label) {
            var button = document.createElement('button');
            button.style.float = 'right';
            button.style.minWidth = '112px';
            button.style.display = 'inline-block';
            button.style.textAlign = 'center';
            button.style.zoom = '1';
            button.style.fontFamily = '\'Helvetica Neue\', \'Roboto\', \'Segoe UI\', \'sans-serif\'';
            button.style.overflow = 'visible';
            button.style.border = '1px solid #d3d3d3';
            button.style.background = '#e6e6e6';
            button.style.fontWeight = 'normal';
            button.style.color = '#555';
            button.style.margin = '10px 0 10px 10px';
            button.style.cursor = 'pointer';
            button.style.fontSize = '14px';
            button.style.minHeight = '30px';
            button.tabIndex = idx;
            button.onclick = makeButtonCallback(idx + 1);
            button.appendChild(document.createTextNode(label));
            dlg.appendChild(button);
        }

        // reverse order is used since we align buttons to the right
        for (var idx = buttons.length - 1; idx >= 0; idx--) {
            addButton(idx, buttons[idx]);
        }

        dlgWrap.appendChild(dlg);
        document.body.appendChild(dlgWrap);

        // make sure input field is under focus
        if (addInput) {
            setTimeout(function() {
                dlg.querySelector('#prompt-input').focus();
            });
        }

        return dlgWrap;
    }
};
