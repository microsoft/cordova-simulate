// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {
    messages.register('pickContact', function (event, callback) {
        var contacts = event;

        if (!contacts || contacts.length === 0) {
            callback('No contacts found');
            return;
        }

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

        var titleStyle = 'border-top-left-radius: 2px; border-top-right-radius: 2px; position: relative; background-color: #03a9f4; color: #fff; font-size: 18px; padding: 7px 10px; height: 30px; text-transform: none; font-family: \'Helvetica Neue\', \'Roboto\', \'Segoe UI\', \'sans-serif\'; line-height: 24px; margin: -10px;';

        // dialog layout template
        var dlgHtml = '<section id="lbl-title" style="' + titleStyle + '"></section>';

        dlg.innerHTML = dlgHtml;

        dlg.querySelector('#lbl-title').appendChild(document.createTextNode('Please pick a contact'));

        var ul = document.createElement('ul');
        ul.style.maxHeight = '500px';
        ul.style.overflow = 'auto';
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        contacts.forEach(function (contact) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            li.appendChild(a);
            a.href = '#';
            a.style.color = '#3c8b9e';
            a.style.textTransform = 'none';
            a.style.fontSize = '14px';
            a.style.fontWeight = 'bold';
            a.style.margin = '20px 0 0 0';
            a.style.fontFamily = '\'Helvetica Neue\', \'Roboto\', \'Segoe UI\', \'sans-serif\'';
            var contactInfo = contact.id;
            if (contact.displayName !== null && contact.displayName !== '') {
                contactInfo += ' (' + contact.displayName + ')';
            }
            a.innerHTML = contactInfo;
            a.addEventListener('click', function () {
                dlgWrap.parentNode.removeChild(dlgWrap);
                callback(false, contact);
            }, false);
            ul.appendChild(li);
        });
        dlg.appendChild(ul);
        dlgWrap.appendChild(dlg);
        document.body.appendChild(dlgWrap);
    });
};
