// Copyright (c) Microsoft Corporation. All rights reserved.
// Based in part on code from Apache Ripple, https://github.com/apache/incubator-ripple

var utils = require('utils'),
    constants = require('sim-constants'),
    event = require('event'),
    DB_NAME = 'ripple',
    cache,
    self,
    opendb;

// TODO: This could use some refactoring..

function saveToStorage() {
    localStorage[DB_NAME] = JSON.stringify(cache);
}

function validateAndSetPrefix(prefix) {
    if (prefix) {
        utils.validateArgumentType(prefix, 'string');
    }

    return prefix || constants.COMMON.PREFIX;
}

function createKey(key, prefix) {
    return validateAndSetPrefix(prefix) + key;
}

function createItem(key, value, prefix) {
    return {
        id: createKey(key, prefix),
        key: key,
        value: value,
        prefix: validateAndSetPrefix(prefix)
    };
}

function save(key, value, prefix, callback) {
    var item = createItem(key, value, prefix);
    cache[item.id] = item;

    if (!window.openDatabase) {
        saveToStorage();
        if (callback) { callback(); }
    } else {
        opendb.transaction(function (tx) {
            tx.executeSql('REPLACE INTO persistence (id, key, value, prefix) VALUES (?, ?, ?, ?)', [item.id, item.key, item.value, item.prefix], function () {
                return callback && callback();
            });
        });
    }
}

function retrieve(key, prefix) {
    var item = cache[createKey(key, prefix)];
    return item ? item.value : undefined;
}

function retrieveAll(prefix, callback) {
    var result = {};

    if (prefix) {
        utils.forEach(cache, function (value) {
            if (value.prefix === prefix) {
                result[value.key] = value.value;
            }
        });
    }

    if (callback) { callback(result); }
}

function remove(key, prefix, callback) {
    var id = createKey(key, prefix);

    delete cache[id];

    if (!window.openDatabase) {
        saveToStorage();
        if (callback) { callback(); }
    } else {
        opendb.transaction(function (tx) {
            tx.executeSql('DELETE FROM persistence WHERE key = ? AND prefix = ?', [key, validateAndSetPrefix(prefix)], function () {
                return callback && callback();
            });
        });
    }
}

function removeAll(callback) {
    cache = {};

    if (!window.openDatabase) {
        delete localStorage[DB_NAME];
        saveToStorage();
    } else {
        opendb.transaction(function (tx) {
            tx.executeSql('DELETE FROM persistence', [], function () {
                return callback && callback();
            });
        });
    }
}

self = {
    save: function (key, value, prefix, callback) {
        save(key, value, prefix, callback);
        event.trigger('StorageUpdatedEvent');
    },

    saveObject: function (key, obj, prefix, callback) {
        save(key, JSON.stringify(obj), prefix, callback);
        event.trigger('StorageUpdatedEvent');
    },

    retrieve: function (key, prefix) {
        return retrieve(key, prefix);
    },

    retrieveObject: function (key, prefix) {
        var retrievedValue = retrieve(key, prefix);
        return retrievedValue ? JSON.parse(retrievedValue) : retrievedValue;
    },

    retrieveAll: function (prefix, callback) {
        return retrieveAll(prefix, callback);
    },

    remove: function (key, prefix, callback) {
        event.trigger('StorageUpdatedEvent');
        remove(key, prefix, callback);
    },

    removeAll: function (callback) {
        removeAll(callback);
        event.trigger('StorageUpdatedEvent');
    },

    initialize: function () {
        return new Promise((resolve) => {
            if (!window.openDatabase) {
                var store = localStorage[DB_NAME];
                cache = store ? JSON.parse(store) : {};
                saveToStorage();
                resolve();
            } else {
                cache = {};
                opendb = openDatabase('tinyHippos', '1.0', 'tiny Hippos persistence', 2 * 1024 * 1024);
                opendb.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS persistence (id unique, key, value, prefix)');
    
                    tx.executeSql('SELECT id, key, value, prefix FROM persistence', [], function (tx, results) {
                        var len = results.rows.length, i, item;
    
                        for (i = 0; i < len; i++) {
                            item = results.rows.item(i);
                            cache[item.id] = item;
                        }
    
                        resolve();
                    });
                });
            }
        });
    }
};

module.exports = self;
