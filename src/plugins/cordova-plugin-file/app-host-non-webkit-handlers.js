// Copyright (c) Microsoft Corporation. All rights reserved.

/*global Uint8Array: false */

if (!window.indexedDB) {
    throw new Error('indexedDB not supported');
}

// Since we are using browser implementation
// of cordova-file-plugin for non-webkit browsers,
// we should reference MyFile, because currently loaded
// simulation platform might not be the 'browser'.
// (browser platform uses this file in its implementation).
var MyFile = require('./MyFile');

// Since we are using browser implementation
// of cordova-file-plugin for non-webkit browsers,
// we should reference Indexed DB, because currently loaded
// simulation platform might not be the 'browser'.
// (browser platform uses this file in its implementation).
var indexedDB = require('./indexedDB');

var DIR_SEPARATOR = '/';
var FILESYSTEM_PREFIX = 'file:///';

var fileSystem = null;

var pathsPrefix = {
    // Read-only directory where the application is installed.
    applicationDirectory: window.location.origin + '/',
    // Where to put app-specific data files.
    dataDirectory: 'file:///persistent/',
    // Cached files that should survive app restarts.
    // Apps should not rely on the OS to delete files in here.
    cacheDirectory: 'file:///temporary/',
    // Read-only directory where the application is installed.
    // Android: the application space on external storage.
    externalApplicationStorageDirectory: null,
    // Android: Where to put app-specific data files on external storage.
    externalDataDirectory: null,
    // Android: the application cache on external storage.
    externalCacheDirectory: null,
    // Android: the external storage (SD card) root.
    externalRootDirectory: null,
    // iOS: Temp directory that the OS can clear at will.
    tempDirectory: null,
    // iOS: Holds app-specific files that should be synced (e.g. to iCloud).
    syncedDataDirectory: null,
    // iOS: Files private to the app, but that are meaningful to other applciations (e.g. Office files)
    documentsDirectory: null,
    // BlackBerry10: Files globally available to all apps
    sharedDirectory: null
};

// We must override some functionality so that plugin can work properly,
// for example, we cannot call 'cordova' or file-plugin related files before deviceready
// event fired since app-host-handler's files initializes before them.
document.addEventListener('deviceready', function () {
    // We must override getFs function since we are using browser implementation
    // of cordova-plugin-file so everything will work as expected.
    window.cordova.require('cordova-plugin-file.fileSystems').getFs = function (name, callback) {
        callback(new window.FileSystem(name, fileSystem.root));
    };
    // Special functionality for proper Firefox work.
    window.FileSystem.prototype.__format__ = function(fullPath) {
        return (FILESYSTEM_PREFIX + this.name + (fullPath[0] === '/' ? '' : '/') + encodeURI(fullPath));
    };
}, false);

/*** Helpers ***/

// When saving an entry, the fullPath should always lead with a slash and never
// end with one (e.g. a directory). Also, resolve '.' and '..' to an absolute
// one. This method ensures path is legit!
function resolveToFullPath_(cwdFullPath, path) {
    path = path || '';
    var fullPath = path;
    var prefix = '';

    cwdFullPath = cwdFullPath || DIR_SEPARATOR;
    if (cwdFullPath.indexOf(FILESYSTEM_PREFIX) === 0) {
        prefix = cwdFullPath.substring(0, cwdFullPath.indexOf(DIR_SEPARATOR, FILESYSTEM_PREFIX.length));
        cwdFullPath = cwdFullPath.substring(cwdFullPath.indexOf(DIR_SEPARATOR, FILESYSTEM_PREFIX.length));
    }

    var relativePath = path[0] !== DIR_SEPARATOR;
    if (relativePath) {
        fullPath = cwdFullPath;
        if (cwdFullPath !== DIR_SEPARATOR) {
            fullPath += DIR_SEPARATOR + path;
        } else {
            fullPath += path;
        }
    }

    // Remove doubled separator substrings
    var re = new RegExp(DIR_SEPARATOR + DIR_SEPARATOR, 'g');
    fullPath = fullPath.replace(re, DIR_SEPARATOR);

    // Adjust '..'s by removing parent directories when '..' flows in path.
    var parts = fullPath.split(DIR_SEPARATOR);
    for (var i = 0; i < parts.length; ++i) {
        var part = parts[i];
        if (part === '..') {
            parts[i - 1] = '';
            parts[i] = '';
        }
    }
    fullPath = parts.filter(function(el) {
        return el;
    }).join(DIR_SEPARATOR);

    // Add back in leading slash.
    if (fullPath[0] !== DIR_SEPARATOR) {
        fullPath = DIR_SEPARATOR + fullPath;
    }

    // Replace './' by current dir. ('./one/./two' -> one/two)
    fullPath = fullPath.replace(/\.\//g, DIR_SEPARATOR);

    // Replace '//' with '/'.
    fullPath = fullPath.replace(/\/\//g, DIR_SEPARATOR);

    // Replace '/.' with '/'.
    fullPath = fullPath.replace(/\/\./g, DIR_SEPARATOR);

    // Remove '/' if it appears on the end.
    if (fullPath[fullPath.length - 1] === DIR_SEPARATOR &&
        fullPath !== DIR_SEPARATOR) {
        fullPath = fullPath.substring(0, fullPath.length - 1);
    }

    var storagePath = prefix + fullPath;
    storagePath = decodeURI(storagePath);
    fullPath = decodeURI(fullPath);

    return {
        storagePath: storagePath,
        fullPath: fullPath,
        fileName: fullPath.split(DIR_SEPARATOR).pop(),
        fsName: prefix.split(DIR_SEPARATOR).pop()
    };
}

function fileEntryFromIdbEntry(fileEntry) {
    // IDB won't save methods, so we need re-create the FileEntry.
    var clonedFileEntry = new window.FileEntry(fileEntry.name, fileEntry.fullPath, fileEntry.filesystem);
    clonedFileEntry.file_ = fileEntry.file_;

    return clonedFileEntry;
}

function readAs(what, fullPath, encoding, startPos, endPos, successCallback, errorCallback) {
    getFile(function(fileEntry) {
        var fileReader = new FileReader(),
            blob = fileEntry.file_.blob_.slice(startPos, endPos);

        fileReader.onload = function(e) {
            successCallback(e.target.result);
        };

        fileReader.onerror = errorCallback;

        switch (what) {
            case 'text':
                fileReader.readAsText(blob, encoding);
                break;
            case 'dataURL':
                fileReader.readAsDataURL(blob);
                break;
            case 'arrayBuffer':
                fileReader.readAsArrayBuffer(blob);
                break;
            case 'binaryString':
                fileReader.readAsBinaryString(blob);
                break;
        }

    }, errorCallback, [fullPath, null]);
}

/*** Handlers ***/

function requestFileSystem(successCallback, errorCallback, args) {
    var type = args[0];
    // Size is ignored since IDB filesystem size depends
    // on browser implementation and can't be set up by user
    var size = args[1]; // eslint-disable-line no-unused-vars

    if (type !== window.LocalFileSystem.TEMPORARY && type !== window.LocalFileSystem.PERSISTENT) {
        errorCallback && errorCallback(window.FileError.INVALID_MODIFICATION_ERR);
        return;
    }

    var name = type === window.LocalFileSystem.TEMPORARY ? 'temporary' : 'persistent';
    var storageName = (location.protocol + location.host).replace(/:/g, '_');

    var root = new window.DirectoryEntry('', DIR_SEPARATOR);
    fileSystem = new window.FileSystem(name, root);

    indexedDB.open(storageName, function() {
        successCallback(fileSystem);
    }, errorCallback);
}

function requestFileSystemHandler(successCallback, errorCallback, module, event, args) {
    requestFileSystem(successCallback, errorCallback, args);
}

// list a directory's contents (files and folders).
function readEntries(successCallback, errorCallback, args) {
    var fullPath = args[0];

    if (typeof successCallback !== 'function') {
        throw Error('Expected successCallback argument.');
    }

    var path = resolveToFullPath_(fullPath);

    getDirectory(function() {
        indexedDB.getAllEntries(path.fullPath + DIR_SEPARATOR, path.storagePath, function(entries) {
            successCallback(entries);
        }, errorCallback);
    }, function() {
        if (errorCallback) {
            errorCallback(window.FileError.NOT_FOUND_ERR);
        }
    }, [path.storagePath, path.fullPath, {create: false}]);
}

function readEntriesHandler(successCallback, errorCallback, module, event, args) {
    readEntries(successCallback, errorCallback, args);
}

function getFile(successCallback, errorCallback, args) {
    var fullPath = args[0];
    var path = args[1];
    var options = args[2] || {};

    // Create an absolute path if we were handed a relative one.
    path = resolveToFullPath_(fullPath, path);

    indexedDB.get(path.storagePath, function(fileEntry) {
        if (options.create === true && options.exclusive === true && fileEntry) {
            // If create and exclusive are both true, and the path already exists,
            // getFile must fail.

            if (errorCallback) {
                errorCallback(window.FileError.PATH_EXISTS_ERR);
            }
        } else if (options.create === true && !fileEntry) {
            // If create is true, the path doesn't exist, and no other error occurs,
            // getFile must create it as a zero-length file and return a corresponding
            // FileEntry.
            var newFileEntry = new window.FileEntry(path.fileName, path.fullPath, new window.FileSystem(path.fsName, fileSystem.root));

            newFileEntry.file_ = new MyFile({
                size: 0,
                name: newFileEntry.name,
                lastModifiedDate: new Date(),
                storagePath: path.storagePath
            });

            indexedDB.put(newFileEntry, path.storagePath, successCallback, errorCallback);
        } else if (options.create === true && fileEntry) {
            if (fileEntry.isFile) {
                // Overwrite file, delete then create new.
                indexedDB['delete'](path.storagePath, function() {
                    var newFileEntry = new window.FileEntry(path.fileName, path.fullPath, new window.FileSystem(path.fsName, fileSystem.root));

                    newFileEntry.file_ = new MyFile({
                        size: 0,
                        name: newFileEntry.name,
                        lastModifiedDate: new Date(),
                        storagePath: path.storagePath
                    });

                    indexedDB.put(newFileEntry, path.storagePath, successCallback, errorCallback);
                }, errorCallback);
            } else {
                if (errorCallback) {
                    errorCallback(window.FileError.INVALID_MODIFICATION_ERR);
                }
            }
        } else if ((!options.create || options.create === false) && !fileEntry) {
            // If create is not true and the path doesn't exist, getFile must fail.
            if (errorCallback) {
                errorCallback(window.FileError.NOT_FOUND_ERR);
            }
        } else if ((!options.create || options.create === false) && fileEntry &&
            fileEntry.isDirectory) {
            // If create is not true and the path exists, but is a directory, getFile
            // must fail.
            if (errorCallback) {
                errorCallback(window.FileError.TYPE_MISMATCH_ERR);
            }
        } else {
            // Otherwise, if no other error occurs, getFile must return a FileEntry
            // corresponding to path.

            successCallback(fileEntryFromIdbEntry(fileEntry));
        }
    }, errorCallback);
}

function getFileHandler(successCallback, errorCallback, module, event, args) {
    getFile(successCallback, errorCallback, args);
}

function getFileMetadata(successCallback, errorCallback, module, event, args) {
    var fullPath = args[0];

    getFile(function(fileEntry) {
        successCallback(new window.File(fileEntry.file_.name, fileEntry.fullPath, '', fileEntry.file_.lastModifiedDate,
            fileEntry.file_.size));
    }, errorCallback, [fullPath, null]);
}

function setMetadata(successCallback, errorCallback, module, event, args) {
    var fullPath = args[0];
    var metadataObject = args[1];

    getFile(function (fileEntry) {
        fileEntry.file_.lastModifiedDate = metadataObject.modificationTime;
        indexedDB.put(fileEntry, fileEntry.file_.storagePath, successCallback, errorCallback);
    }, errorCallback, [fullPath, null]);
}

function write(successCallback, errorCallback, args) {
    var fileName = args[0],
        data = args[1],
        position = args[2],
        isBinary = args[3]; // eslint-disable-line no-unused-vars

    if (!data) {
        errorCallback && errorCallback(window.FileError.INVALID_MODIFICATION_ERR);
        return;
    }

    if (typeof data === 'string' || data instanceof String) {
        data = new Blob([data]);
    }

    getFile(function(fileEntry) {
        var blob_ = fileEntry.file_.blob_;

        if (!blob_) {
            blob_ = new Blob([data], {type: data.type});
        } else {
            // Calc the head and tail fragments
            var head = blob_.slice(0, position);
            var tail = blob_.slice(position + (data.size || data.byteLength));

            // Calc the padding
            var padding = position - head.size;
            if (padding < 0) {
                padding = 0;
            }

            // Do the 'write'. In fact, a full overwrite of the Blob.
            blob_ = new Blob([head, new Uint8Array(padding), data, tail],
                {type: data.type});
        }

        // Set the blob we're writing on this file entry so we can recall it later.
        fileEntry.file_.blob_ = blob_;
        fileEntry.file_.lastModifiedDate = new Date() || null;
        fileEntry.file_.size = blob_.size;
        fileEntry.file_.name = blob_.name;
        fileEntry.file_.type = blob_.type;

        indexedDB.put(fileEntry, fileEntry.file_.storagePath, function() {
            successCallback(data.size || data.byteLength);
        }, errorCallback);
    }, errorCallback, [fileName, null]);
}

function writeHandler(successCallback, errorCallback, module, event, args) {
    write(successCallback, errorCallback, args);
}

function readAsTextHandler(successCallback, errorCallback, module, event, args) {
    var fileName = args[0],
        enc = args[1],
        startPos = args[2],
        endPos = args[3];

    readAs('text', fileName, enc, startPos, endPos, successCallback, errorCallback);
}

function readAsDataURLHandler(successCallback, errorCallback, module, event, args) {
    var fileName = args[0],
        startPos = args[1],
        endPos = args[2];

    readAs('dataURL', fileName, null, startPos, endPos, successCallback, errorCallback);
}

function readAsBinaryStringHandler(successCallback, errorCallback, module, event, args) {
    var fileName = args[0],
        startPos = args[1],
        endPos = args[2];

    readAs('binaryString', fileName, null, startPos, endPos, successCallback, errorCallback);
}

function readAsArrayBufferHandler(successCallback, errorCallback, module, event, args) {
    var fileName = args[0],
        startPos = args[1],
        endPos = args[2];

    readAs('arrayBuffer', fileName, null, startPos, endPos, successCallback, errorCallback);
}

function removeRecursively(successCallback, errorCallback, module, event, args) {
    removeHandler(successCallback, errorCallback, module, event, args);
}

function remove(successCallback, errorCallback, args) {
    var fullPath = resolveToFullPath_(args[0]).storagePath;
    if (fullPath === pathsPrefix.cacheDirectory || fullPath === pathsPrefix.dataDirectory) {
        errorCallback(window.FileError.NO_MODIFICATION_ALLOWED_ERR);
        return;
    }

    function deleteEntry(isDirectory) {
        // TODO: This doesn't protect against directories that have content in it.
        // Should throw an error instead if the dirEntry is not empty.
        indexedDB['delete'](fullPath, function() {
            successCallback && successCallback();
        }, function() {
            errorCallback && errorCallback();
        }, isDirectory);
    }

    // We need to to understand what we are deleting:
    getDirectory(function(entry) {
        deleteEntry(entry.isDirectory);
    }, function(){
        //DirectoryEntry was already deleted or entry is FileEntry
        deleteEntry(false);
    }, [fullPath, null, {create: false}]);
}

function removeHandler(successCallback, errorCallback, module, event, args) {
    remove(successCallback, errorCallback, args);
}

function getDirectory(successCallback, errorCallback, args) {
    var fullPath = args[0];
    var path = args[1];
    var options = args[2];

    // Create an absolute path if we were handed a relative one.
    path = resolveToFullPath_(fullPath, path);

    indexedDB.get(path.storagePath, function(folderEntry) {
        if (!options) {
            options = {};
        }

        if (options.create === true && options.exclusive === true && folderEntry) {
            // If create and exclusive are both true, and the path already exists,
            // getDirectory must fail.
            if (errorCallback) {
                errorCallback(window.FileError.PATH_EXISTS_ERR);
            }
            // There is a strange bug in mobilespec + FF, which results in coming to multiple else-if's
            // so we are shielding from it with returns.
            return;
        }

        if (options.create === true && !folderEntry) {
            // If create is true, the path doesn't exist, and no other error occurs,
            // getDirectory must create it as a zero-length file and return a corresponding
            // MyDirectoryEntry.
            var dirEntry = new window.DirectoryEntry(path.fileName, path.fullPath, new window.FileSystem(path.fsName, fileSystem.root));

            indexedDB.put(dirEntry, path.storagePath, successCallback, errorCallback);
            return;
        }

        if (options.create === true && folderEntry) {

            if (folderEntry.isDirectory) {
                // IDB won't save methods, so we need re-create the MyDirectoryEntry.
                successCallback(new window.DirectoryEntry(folderEntry.name, folderEntry.fullPath, folderEntry.filesystem));
            } else {
                if (errorCallback) {
                    errorCallback(window.FileError.INVALID_MODIFICATION_ERR);
                }
            }
            return;
        }

        if ((!options.create || options.create === false) && !folderEntry) {
            // Handle root special. It should always exist.
            if (path.fullPath === DIR_SEPARATOR) {
                successCallback(fileSystem.root);
                return;
            }

            // If create is not true and the path doesn't exist, getDirectory must fail.
            if (errorCallback) {
                errorCallback(window.FileError.NOT_FOUND_ERR);
            }

            return;
        }
        if ((!options.create || options.create === false) && folderEntry && folderEntry.isFile) {
            // If create is not true and the path exists, but is a file, getDirectory
            // must fail.
            if (errorCallback) {
                errorCallback(window.FileError.TYPE_MISMATCH_ERR);
            }
            return;
        }

        // Otherwise, if no other error occurs, getDirectory must return a
        // MyDirectoryEntry corresponding to path.

        // IDB won't' save methods, so we need re-create MyDirectoryEntry.
        successCallback(new window.DirectoryEntry(folderEntry.name, folderEntry.fullPath, folderEntry.filesystem));
    }, errorCallback);
}

function getDirectoryHandler(successCallback, errorCallback, module, event, args) {
    getDirectory(successCallback, errorCallback, args);
}

function getParentHandler(successCallback, errorCallback, module, args) {
    if (typeof successCallback !== 'function') {
        throw Error('Expected successCallback argument.');
    }

    var fullPath = args[0];
    //fullPath is like this:
    //file:///persistent/path/to/file or
    //file:///persistent/path/to/directory/

    if (fullPath === DIR_SEPARATOR || fullPath === pathsPrefix.cacheDirectory ||
        fullPath === pathsPrefix.dataDirectory) {
        successCallback(fileSystem.root);
        return;
    }

    //To delete all slashes at the end
    while (fullPath[fullPath.length - 1] === '/') {
        fullPath = fullPath.substr(0, fullPath.length - 1);
    }

    var pathArr = fullPath.split(DIR_SEPARATOR);
    pathArr.pop();
    var parentName = pathArr.pop();
    var path = pathArr.join(DIR_SEPARATOR) + DIR_SEPARATOR;

    //To get parent of root files
    var joined = path + parentName + DIR_SEPARATOR;//is like this: file:///persistent/
    if (joined === pathsPrefix.cacheDirectory || joined === pathsPrefix.dataDirectory) {
        getDirectory(successCallback, errorCallback, [joined, DIR_SEPARATOR, {create: false}]);
        return;
    }

    getDirectory(successCallback, errorCallback, [path, parentName, {create: false}]);
}

function copyTo(successCallback, errorCallback, args) {
    var srcPath = args[0];
    var parentFullPath = args[1];
    var name = args[2];

    if (name.indexOf('/') !== -1 || srcPath === parentFullPath + name) {
        if (errorCallback) {
            errorCallback(window.FileError.INVALID_MODIFICATION_ERR);
        }

        return;
    }

    // Read src file
    getFile(function(srcFileEntry) {

        var path = resolveToFullPath_(parentFullPath);
        //Check directory
        getDirectory(function() {

            // Create dest file
            getFile(function(dstFileEntry) {

                write(function() {
                    successCallback(dstFileEntry);
                }, errorCallback, [dstFileEntry.file_.storagePath, srcFileEntry.file_.blob_, 0]);

            }, errorCallback, [parentFullPath, name, {create: true}]);

        }, function() { if (errorCallback) { errorCallback(window.FileError.NOT_FOUND_ERR); }},
        [path.storagePath, null, {create:false}]);

    }, errorCallback, [srcPath, null]);
}

function copyToHandler(successCallback, errorCallback, module, event, args) {
    copyTo(successCallback, errorCallback, args);
}

function moveToHandler(successCallback, errorCallback, module, event, args) {
    var srcPath = args[0];
    // parentFullPath and name parameters is ignored because
    // args is being passed downstream to exports.copyTo method
    var parentFullPath = args[1]; // eslint-disable-line no-unused-vars
    var name = args[2]; // eslint-disable-line no-unused-vars

    copyTo(function (fileEntry) {
        remove(function () {
            successCallback(fileEntry);
        }, errorCallback, [srcPath]);
    }, errorCallback, args);
}

function resolveLocalFileSystemURI(successCallback, errorCallback, args) {
    var path = args[0];

    // Ignore parameters
    if (path.indexOf('?') !== -1) {
        path = String(path).split('?')[0];
    }

    // support for encodeURI
    if (/\%5/g.test(path) || /\%20/g.test(path)) {
        path = decodeURI(path);
    }

    if (path.trim()[0] === '/') {
        errorCallback && errorCallback(window.FileError.ENCODING_ERR);
        return;
    }

    //support for cdvfile
    if (path.trim().substr(0,7) === 'cdvfile') {
        if (path.indexOf('cdvfile://localhost') === -1) {
            errorCallback && errorCallback(window.FileError.ENCODING_ERR);
            return;
        }

        var indexPersistent = path.indexOf('persistent');
        var indexTemporary = path.indexOf('temporary');

        //cdvfile://localhost/persistent/path/to/file
        if (indexPersistent !== -1) {
            path =  'file:///persistent' + path.substr(indexPersistent + 10);
        } else if (indexTemporary !== -1) {
            path = 'file:///temporary' + path.substr(indexTemporary + 9);
        } else {
            errorCallback && errorCallback(window.FileError.ENCODING_ERR);
            return;
        }
    }

    // to avoid path form of '///path/to/file'
    function handlePathSlashes(path) {
        var cutIndex  = 0;
        for (var i = 0; i < path.length - 1; i++) {
            if (path[i] === DIR_SEPARATOR && path[i + 1] === DIR_SEPARATOR) {
                cutIndex = i + 1;
            } else break;
        }

        return path.substr(cutIndex);
    }

    // Handle localhost containing paths (see specs )
    if (path.indexOf('file://localhost/') === 0) {
        path = path.replace('file://localhost/', 'file:///');
    }

    if (path.indexOf(pathsPrefix.dataDirectory) === 0) {
        path = path.substring(pathsPrefix.dataDirectory.length - 1);
        path = handlePathSlashes(path);

        requestFileSystem(function() {
            getFile(successCallback, function() {
                getDirectory(successCallback, errorCallback, [pathsPrefix.dataDirectory, path,
                    {create: false}]);
            }, [pathsPrefix.dataDirectory, path, {create: false}]);
        }, errorCallback, [window.LocalFileSystem.PERSISTENT]);
    } else if (path.indexOf(pathsPrefix.cacheDirectory) === 0) {
        path = path.substring(pathsPrefix.cacheDirectory.length - 1);
        path = handlePathSlashes(path);

        requestFileSystem(function() {
            getFile(successCallback, function() {
                getDirectory(successCallback, errorCallback, [pathsPrefix.cacheDirectory, path,
                    {create: false}]);
            }, [pathsPrefix.cacheDirectory, path, {create: false}]);
        }, errorCallback, [window.LocalFileSystem.TEMPORARY]);
    } else if (path.indexOf(pathsPrefix.applicationDirectory) === 0) {
        path = path.substring(pathsPrefix.applicationDirectory.length);
        //TODO: need to cut out redundant slashes?

        var xhr = new XMLHttpRequest();
        xhr.open('GET', path, true);
        xhr.onreadystatechange = function () {
            if (xhr.status === 200 && xhr.readyState === 4) {
                requestFileSystem(function(fs) {
                    fs.name = location.hostname;

                    //TODO: need to call exports.getFile(...) to handle errors correct
                    fs.root.getFile(path, {create: true}, writeFile, errorCallback);
                }, errorCallback, [window.LocalFileSystem.PERSISTENT]);
            }
        };

        xhr.onerror = function () {
            errorCallback && errorCallback(window.FileError.NOT_READABLE_ERR);
        };

        xhr.send();
    } else {
        errorCallback && errorCallback(window.FileError.NOT_FOUND_ERR);
    }

    function writeFile(entry) {
        entry.createWriter(function (fileWriter) {
            fileWriter.onwriteend = function (evt) {
                if (!evt.target.error) {
                    entry.filesystemName = location.hostname;
                    successCallback(entry);
                }
            };
            fileWriter.onerror = function () {
                errorCallback && errorCallback(window.FileError.NOT_READABLE_ERR);
            };
            fileWriter.write(new Blob([xhr.response]));
        }, errorCallback);
    }
}

function resolveLocalFileSystemURIHandler(successCallback, errorCallback, module, event, args) {
    resolveLocalFileSystemURI(successCallback, errorCallback, args);
}

function requestAllPathsHandler(successCallback, errorCallback, module, event, args) {
    successCallback(pathsPrefix);
}

// This handler is required for tests and backwards compatibility
function _getLocalFilesystemPathHandler(successCallback, errorCallback, module, event, args) {
    var url = args[0];
    var stringToCut = 'file://';
    var fileIndex = url.indexOf(stringToCut);
    if (fileIndex !== -1) {
        url = url.substr(stringToCut.length, url.length-stringToCut.length);
    }
    successCallback(url);
}

function notifyNotSupported(success, fail, args) {
    fail('This method is not supported yet');
}

module.exports = {
    'File': {
        'requestAllPaths': requestAllPathsHandler,
        'getDirectory': getDirectoryHandler,
        'removeRecursively': removeRecursively,
        'getFile': getFileHandler,
        'readEntries': readEntriesHandler,
        'getFileMetadata': getFileMetadata,
        'setMetadata': setMetadata,
        'moveTo': moveToHandler,
        'copyTo': copyToHandler,
        'remove': removeHandler,
        'getParent': getParentHandler,
        'readAsDataURL': readAsDataURLHandler,
        'readAsBinaryString': readAsBinaryStringHandler,
        'readAsArrayBuffer': readAsArrayBufferHandler,
        'readAsText': readAsTextHandler,
        'write': writeHandler,
        'requestFileSystem': requestFileSystemHandler,
        'resolveLocalFileSystemURI': resolveLocalFileSystemURIHandler,
        // exec's below are not implemented in browser platform
        'truncate': notifyNotSupported,
        'requestAllFileSystems': notifyNotSupported,
        // method below is used for backward compatibility w/ old File plugin implementation
        '_getLocalFilesystemPath': _getLocalFilesystemPathHandler
    }
};
