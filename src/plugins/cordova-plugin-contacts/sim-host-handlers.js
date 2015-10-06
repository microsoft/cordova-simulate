// Copyright (c) Microsoft Corporation. All rights reserved.

var db = require('db');
var dbContactsObjectName = 'contacts';
var defaultContacts = require('./default-contacts');

module.exports = function (messages) {
    // load default contacts if no contacts were saved
    var contacts = db.retrieveObject(dbContactsObjectName) || [];
    if (contacts.length === 0) {
        db.saveObject(dbContactsObjectName, defaultContacts);
    }

    function save(success, fail, args) {
        var contact = args[0];
        if (!contact.id) {
            contact.id = generateGuid();
        }
        var contacts = db.retrieveObject(dbContactsObjectName) || [];
        var updateOperation = false;
        for (var i = 0; i < contacts.length; i++) {
            if (contacts[i].id === contact.id) {
                contacts[i] = contact;
                updateOperation = true;
            }
        }
        if (!updateOperation) {
            contacts.push(contact);
        } else {
            // Some contact properties uses arrays of specific objects
            // in this case we should look at 'value' fields of these objects
            // and remove these objects if 'value' is empty
            for (var propIndex in contact) {
                var property = contact[propIndex];
                // Check if property is Array
                if (property !== null && Object.prototype.toString.call(property) === '[object Array]') {
                    for (var itemIndex in property) {
                        var item = property[itemIndex];
                        if (item && typeof item.value !== 'undefined' && item.value === '') {
                            var emptyIndex = contact[propIndex].indexOf(item);
                            contact[propIndex].splice(emptyIndex, 1);
                        }
                    }
                }
            }
        }
        db.saveObject(dbContactsObjectName, contacts);
        success(contact);
    }

    function remove(success, fail, args) {
        var id = args[0];
        var contacts = db.retrieveObject(dbContactsObjectName) || [];
        var indexToDelete = null;
        for (var i = 0; i < contacts.length; i++) {
            if (contacts[i].id === id) {
                indexToDelete = i;
                break;
            }
        }

        if (indexToDelete !== null) {
            contacts.splice(indexToDelete, 1);
            db.saveObject(dbContactsObjectName, contacts);
            success();
        } else {
            // 0 refers to ContactError.UNKNOWN_ERROR
            fail(0);
        }
    }

    function search(success, fail, args) {
        var fields = args[0];
        var options = args[1];

        var contacts = db.retrieveObject(dbContactsObjectName) || [];

        var queryResult = contacts.filter(function(contact) {
             return isContactMatchesFilter(contact, options, fields);
        });

        if (!options.multiple && queryResult.length > 1) {
            // select only first contact found
            queryResult = [queryResult[0]];
        }

        queryResult = queryResult.map(function (contact) {
            return extractDesiredFields(contact, options.desiredFields);
        });

        success(queryResult);
    }

    function pickContact(success, fail, args) {
        var contacts = db.retrieveObject(dbContactsObjectName) || [];
        messages.call('pickContact', contacts).then(function (result) {
            success(result);
        }, function (err) {
            fail(err);
        });
    }

    function isContactMatchesFilter(contact, options, fields) {
        // test special case (hasPhoneNumber option)
        if (options.hasPhoneNumber && (!contact.phoneNumbers || contact.phoneNumbers.length === 0)) {
            return false;
        }

        // If filter is not set we assume contact matches it (used to return all contacts)
        if (!options.filter || options.filter === '') {
            return true;
        }

        var contactField;
        // Searching by all fields
        if (fields.indexOf('*') !== -1) {
            for (var index in contact) {
                contactField = contact[index];
                if (isContactFieldMatchesFilter(contactField, options.filter)) {
                    return true;
                }
            }
        } else {
            // Searching only by fields specified in args
            for (var fieldIndex in fields) {
                var contactFieldName = fields[fieldIndex];
                contactField = contact[contactFieldName];
                if (isContactFieldMatchesFilter(contactField, options.filter)) {
                    return true;
                }
            }
        }
        return false;
    }

    function isContactFieldMatchesFilter(field, filter) {
        // If contact property contains several fields,
        // we need to search through all of them
        if (typeof field === 'object') {
            for(var fieldIndex in field) {
                if (isContactFieldMatchesFilter(field[fieldIndex], filter)) {
                    return true;
                }
            }
        } else { // test standard type property
            // special partial case insensitive comparison for strings
            if (typeof field === 'string') {
                return field && field.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
            }
            // for non-strings
            return field === filter;
        }
        return false;
    }

    // if desired fields specified, we must return only these fields specified
    function extractDesiredFields(contact, desiredFields) {
        if (desiredFields && desiredFields.length > 0) {
            var newContact = {};
            desiredFields.forEach(function (desired) {
                newContact[desired] = contact[desired];
            });
            return newContact;
        } else {
            return contact;
        }
    }

    function notifyNotSupported(success, fail, args) {
        fail('This method is not supported yet');
    }

    function generateGuid() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
    }

    return {
        'Contacts': {
            // common exec's
            'pickContact': pickContact,
            'search': search,
            'save': save,
            'remove': remove,
            // iOS specific exec's
            'chooseContact': notifyNotSupported,
            'displayContact': notifyNotSupported,
            'newContact': notifyNotSupported
        }
    };
};
