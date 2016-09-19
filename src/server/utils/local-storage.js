// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path'),
    utils = require('./jsUtils');

// A simplistic and not-at-all optimized local storage replacement for our server code.

var DATA_FILE_NAME = 'local-storage.json';
var data;
module.exports = {
    getItem: function (name) {
        return loadData()[name];
    },

    setItem: function (name, value) {
        loadData()[name] = value;
        saveData();
    },

    removeItem: function (name) {
        delete loadData()[name];
        saveData();
    },

    clear: function () {
        data = {};
        saveData();
    }
};

function loadData() {
    if (data) {
        return data;
    }

    var dataPath = getDataPath();
    try {
        data = require(dataPath);
        return data;
    } catch (e) {
        // If the file doesn't exist or there is an error parsing the data,
        // we'll simply return an empty object.
    }

    data = {};
    return data;
}

function saveData() {
    var dataPath = getDataPath();
    fs.writeFileSync(dataPath, JSON.stringify(data, null, '  '));
}

function getDataPath() {
    return path.join(utils.getAppDataPath(), DATA_FILE_NAME);
}