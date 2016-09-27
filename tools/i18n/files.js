// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs');
var path = require('path');

function findFiles(dir, ext) {
    var result = [];
    if (!isDirectory(dir)) {
        return result;
    }

    var files = fs.readdirSync(dir);

    var directories = [];
    // process files then directories
    files.forEach(function (file) {
        file = path.join(dir, file);
        if (isDirectory(file)) {
            directories.push(file);
        } else {
            if (path.extname(file) === '.' + ext) {
                result.push(file);
            }
        }

    });

    directories.forEach(function (dir) {
        result = result.concat(findFiles(dir, ext));
    });

    return result;
}

function isDirectory(path) {
    return existsSync(path) && fs.statSync(path).isDirectory();
}

function makeDirectoryRecursiveSync(dirPath) {
    var parentPath = path.dirname(dirPath);
    if (!existsSync(parentPath) && (parentPath !== dirPath)) {
        makeDirectoryRecursiveSync(parentPath);
    }

    fs.mkdirSync(dirPath);
}

function existsSync(filename) {
    try {
        fs.statSync(filename);
        return true;
    } catch (error) {
        return false;
    }
}

function removeFileAndDirectoryIfEmpty(file) {
    fs.unlinkSync(file);
    removeDirectoryIfEmptyRecursive(path.dirname(file));
}

function removeDirectoryIfEmptyRecursive(directory) {
    if (!fs.readdirSync(directory).length) {
        fs.rmdirSync(directory);
        removeDirectoryIfEmptyRecursive(path.dirname(directory));
    }
}

module.exports = {
    findFiles: findFiles,
    isDirectory: isDirectory,
    makeDirectoryRecursiveSync: makeDirectoryRecursiveSync,
    existsSync: existsSync,
    removeFileAndDirectoryIfEmpty: removeFileAndDirectoryIfEmpty
};