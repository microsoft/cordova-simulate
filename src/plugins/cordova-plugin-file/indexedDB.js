// Copyright (c) Microsoft Corporation. All rights reserved.

var indexedDB = {
    db: null
};

var FILE_STORE_ = 'entries',
    DIR_SEPARATOR = '/',
    unicodeLastChar = 65535;

indexedDB.open = function(dbName, successCallback, errorCallback) {
    var self = this;

    // TODO: FF 12.0a1 isn't liking a db name with : in it.
    var request = window.indexedDB.open(dbName.replace(':', '_')/*, 1 /*version*/);

    request.onerror = errorCallback || onError;

    request.onupgradeneeded = function(e) {
        // First open was called or higher db version was used.

        // console.log('onupgradeneeded: oldVersion:' + e.oldVersion,
        //           'newVersion:' + e.newVersion);

        self.db = e.target.result;
        self.db.onerror = onError;

        if (!self.db.objectStoreNames.contains(FILE_STORE_)) {
            self.db.createObjectStore(FILE_STORE_/*,{keyPath: 'id', autoIncrement: true}*/);
        }
    };

    request.onsuccess = function(e) {
        self.db = e.target.result;
        self.db.onerror = onError;
        successCallback(e);
    };

    request.onblocked = errorCallback || onError;
};

indexedDB.close = function() {
    this.db.close();
    this.db = null;
};

indexedDB.get = function(fullPath, successCallback, errorCallback) {
    if (!this.db) {
        errorCallback && errorCallback(window.FileError.INVALID_MODIFICATION_ERR);
        return;
    }

    var tx = this.db.transaction([FILE_STORE_], 'readonly');

    var request = tx.objectStore(FILE_STORE_).get(fullPath);

    tx.onabort = errorCallback || onError;
    tx.oncomplete = function() {
        successCallback(request.result);
    };
};

indexedDB.getAllEntries = function(fullPath, storagePath, successCallback, errorCallback) {
    if (!this.db) {
        errorCallback && errorCallback(window.FileError.INVALID_MODIFICATION_ERR);
        return;
    }

    var results = [];

    if (storagePath[storagePath.length - 1] === DIR_SEPARATOR) {
        storagePath = storagePath.substring(0, storagePath.length - 1);
    }

    var range = window.IDBKeyRange.bound(storagePath + DIR_SEPARATOR + ' ',
        storagePath + DIR_SEPARATOR + String.fromCharCode(unicodeLastChar));

    var tx = this.db.transaction([FILE_STORE_], 'readonly');
    tx.onabort = errorCallback || onError;
    tx.oncomplete = function() {
        results = results.filter(function(val) {
            var pathWithoutSlash = val.fullPath;

            if (val.fullPath[val.fullPath.length - 1] === DIR_SEPARATOR) {
                pathWithoutSlash = pathWithoutSlash.substr(0, pathWithoutSlash.length - 1);
            }

            var valPartsLen = pathWithoutSlash.split(DIR_SEPARATOR).length;
            var fullPathPartsLen = fullPath.split(DIR_SEPARATOR).length;

            /* Input fullPath parameter  equals '//' for root folder */
            /* Entries in root folder has valPartsLen equals 2 (see below) */
            if (fullPath[fullPath.length - 1] === DIR_SEPARATOR && fullPath.trim().length === 2) {
                fullPathPartsLen = 1;
            } else if (fullPath[fullPath.length - 1] === DIR_SEPARATOR) {
                fullPathPartsLen = fullPath.substr(0, fullPath.length - 1).split(DIR_SEPARATOR).length;
            } else {
                fullPathPartsLen = fullPath.split(DIR_SEPARATOR).length;
            }

            if (valPartsLen === fullPathPartsLen + 1) {
                // If this a subfolder and entry is a direct child, include it in
                // the results. Otherwise, it's not an entry of this folder.
                return val;
            } else return false;
        });

        successCallback(results);
    };

    var request = tx.objectStore(FILE_STORE_).openCursor(range);

    request.onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor) {
            var val = cursor.value;

            results.push(val.isFile ? fileEntryFromIdbEntry(val) : new window.DirectoryEntry(val.name, val.fullPath, val.filesystem));
            cursor['continue']();
        }
    };
};

indexedDB['delete'] = function(fullPath, successCallback, errorCallback, isDirectory) {
    if (!indexedDB.db) {
        errorCallback && errorCallback(window.FileError.INVALID_MODIFICATION_ERR);
        return;
    }

    var tx = this.db.transaction([FILE_STORE_], 'readwrite');
    tx.oncomplete = successCallback;
    tx.onabort = errorCallback || onError;
    tx.oncomplete = function() {
        if (isDirectory) {
            //We delete nested files and folders after deleting parent folder
            //We use ranges: https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange
            fullPath = fullPath + DIR_SEPARATOR;

            //Range contains all entries in the form fullPath<symbol> where
            //symbol in the range from ' ' to symbol which has code `unicodeLastChar`
            var range = window.IDBKeyRange.bound(fullPath + ' ', fullPath + String.fromCharCode(unicodeLastChar));

            var newTx = this.db.transaction([FILE_STORE_], 'readwrite');
            newTx.oncomplete = successCallback;
            newTx.onabort = errorCallback || onError;
            newTx.objectStore(FILE_STORE_)['delete'](range);
        } else {
            successCallback();
        }
    };
    tx.objectStore(FILE_STORE_)['delete'](fullPath);
};

indexedDB.put = function(entry, storagePath, successCallback, errorCallback) {
    if (!this.db) {
        errorCallback && errorCallback(window.FileError.INVALID_MODIFICATION_ERR);
        return;
    }

    var tx = this.db.transaction([FILE_STORE_], 'readwrite');
    tx.onabort = onError;
    tx.oncomplete = function() {
        // TODO: Error is thrown if we pass the request event back instead.
        successCallback(entry);
    };

    tx.objectStore(FILE_STORE_).put(entry, storagePath);
};

function onError(e) {
    switch (e.target.errorCode) {
        case 12:
            console.log('Error - Attempt to open db with a lower version than the ' +
                'current one.');
            break;
        default:
            console.log('errorCode: ' + e.target.errorCode);
    }

    console.log(e, e.code, e.message);
}

function fileEntryFromIdbEntry(fileEntry) {
    // IDB won't save methods, so we need re-create the FileEntry.
    var clonedFileEntry = new window.FileEntry(fileEntry.name, fileEntry.fullPath, fileEntry.filesystem);
    clonedFileEntry.file_ = fileEntry.file_;

    return clonedFileEntry;
}

module.exports = indexedDB;
