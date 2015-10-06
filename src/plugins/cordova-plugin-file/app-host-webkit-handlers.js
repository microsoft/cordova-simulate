// Copyright (c) Microsoft Corporation. All rights reserved.

var filePluginIsReadyEvent = new Event('filePluginIsReady');
var PERSISTENT_FS_QUOTA = 5 * 1024 * 1024;

var entryFunctionsCreated = false;
var quotaWasRequested = false;
var eventWasThrown = false;

window.initPersistentFileSystem = function(size, win, fail) {
    if (navigator.webkitPersistentStorage) {
        navigator.webkitPersistentStorage.requestQuota(size, win, fail);
        return;
    }

    fail('This browser does not support this function');
};

window.isFilePluginReadyRaised = function () { return eventWasThrown; };

window.initPersistentFileSystem(PERSISTENT_FS_QUOTA, function() {
    console.log('Persistent fs quota granted');
    quotaWasRequested = true;
}, function(e){
    console.log('Error occured while trying to request Persistent fs quota: ' + JSON.stringify(e));
});

function dispatchEventIfReady() {
    if (entryFunctionsCreated && quotaWasRequested) {
        window.dispatchEvent(filePluginIsReadyEvent);
        eventWasThrown = true;
    } else {
        setTimeout(dispatchEventIfReady, 100);
    }
}

// We create and fire event 'filePluginIsReady' when file system persistent file quota
// is granted and entry functions are overriden, so we can already work with file system properly.
dispatchEventIfReady();

// We must override some functionality so that plugin can work properly,
// for example, if we override window.requestFileSystem or window.resolveLocalFileSystemURL,
// they might be overrided later, and if we will wait for deviceready event, we assume that
// these functions will not be overrided later.
document.addEventListener('deviceready', function () {
    window.requestFileSystem = window.webkitRequestFileSystem;

    if (!window.requestFileSystem) {
        window.requestFileSystem = function(type, size, win, fail) {
            if (fail) {
                fail('Not supported');
            }
        };
    } else {
        window.requestFileSystem(window.TEMPORARY, 1, createFileEntryFunctions, function() {});
    }

    function createFileEntryFunctions(fs) {
        fs.root.getFile('todelete_658674_833_4_cdv', {create: true}, function(fileEntry) {
            var fileEntryType = Object.getPrototypeOf(fileEntry);
            var entryType = Object.getPrototypeOf(fileEntryType);

            // Save the original method
            var origToURL = entryType.toURL;
            entryType.toURL = function () {
                var origURL = origToURL.call(this);
                if (this.isDirectory && origURL.substr(-1) !== '/') {
                    return origURL + '/';
                }
                return origURL;
            };

            entryType.toNativeURL = function () {
                console.warn('DEPRECATED: Update your code to use \'toURL\'');
                return this.toURL();
            };

            entryType.toInternalURL = function() {
                if (this.toURL().indexOf('persistent') > -1) {
                    return 'cdvfile://localhost/persistent' + this.fullPath;
                }

                if (this.toURL().indexOf('temporary') > -1) {
                    return 'cdvfile://localhost/temporary' + this.fullPath;
                }
            };

            entryType.setMetadata = function(win, fail /*, metadata*/) {
                fail && fail('Not supported');
            };

            fileEntry.createWriter(function(writer) {
                var originalWrite = writer.write;
                var writerProto = Object.getPrototypeOf(writer);
                writerProto.write = function(blob) {
                    if(blob instanceof Blob) {
                        originalWrite.apply(this, [blob]);
                    } else {
                        var realBlob = new Blob([blob]);
                        originalWrite.apply(this, [realBlob]);
                   }
                };

                fileEntry.remove(function(){ entryFunctionsCreated = true; }, function(){ /* empty callback */ });
          });
        });
    }

    if (!window.resolveLocalFileSystemURL) {
        window.resolveLocalFileSystemURL = function(url, win, fail) {
            if(fail) {
                fail('Not supported');
            }
        };
    }

    // Resolves a filesystem entry by its path - which is passed either in standard (filesystem:file://) or
    // Cordova-specific (cdvfile://) universal way.
    // Aligns with specification: http://www.w3.org/TR/2011/WD-file-system-api-20110419/#widl-LocalFileSystem-resolveLocalFileSystemURL
    var nativeResolveLocalFileSystemURL = window.webkitResolveLocalFileSystemURL || window.resolveLocalFileSystemURL;
    window.resolveLocalFileSystemURL = function(url, win, fail) {
        /* If url starts with `cdvfile` then we need convert it to Chrome real url first:
          cdvfile://localhost/persistent/path/to/file -> filesystem:file://persistent/path/to/file */
        if (url.trim().substr(0,7) === 'cdvfile') {
            /* Quirk:
            Plugin supports cdvfile://localhost (local resources) only.
            I.e. external resources are not supported via cdvfile. */
            if (url.indexOf('cdvfile://localhost') !== -1) {
                // Browser supports temporary and persistent only
                var indexPersistent = url.indexOf('persistent');
                var indexTemporary = url.indexOf('temporary');

                /* Chrome urls start with 'filesystem:' prefix. See quirk:
                   toURL function in Chrome returns filesystem:-prefixed path depending on application host.
                   For example, filesystem:file:///persistent/somefile.txt,
                   filesystem:http://localhost:8080/persistent/somefile.txt. */
                var prefix = 'filesystem:file:///';
                if (location.protocol !== 'file:') {
                    prefix = 'filesystem:' + location.origin + '/';
                }

                var result;
                if (indexPersistent !== -1) {
                    // cdvfile://localhost/persistent/path/to/file -> filesystem:file://persistent/path/to/file
                    // or filesystem:http://localhost:8080/persistent/path/to/file
                    result =  prefix + 'persistent' + url.substr(indexPersistent + 10);
                    nativeResolveLocalFileSystemURL(result, win, fail);
                    return;
                }

                if (indexTemporary !== -1) {
                    // cdvfile://localhost/temporary/path/to/file -> filesystem:file://temporary/path/to/file
                    // or filesystem:http://localhost:8080/temporary/path/to/file
                    result = prefix + 'temporary' + url.substr(indexTemporary + 9);
                    nativeResolveLocalFileSystemURL(result, win, fail);
                    return;
                }
            }

            // cdvfile other than local file resource is not supported
            fail && fail(function () {throw new window.FileError(window.FileError.ENCODING_ERR);});
        } else if (url.trim().indexOf('file://') === 0) {
            // ADDED
            url = 'filesystem:http://' + url.replace('file://', '');
            nativeResolveLocalFileSystemURL(url, win, fail);
        } else {
            nativeResolveLocalFileSystemURL(url, win, fail);
        }
    };
}, false);

// This handler is required for tests and backwards compatibility
function _getLocalFilesystemPathHandler(successCallback, errorCallback, module, event, args) {
    var url = args[0];
    var localhostIndex = url.indexOf('localhost');
    if (localhostIndex !== -1) {
        url = url.substr(localhostIndex, url.length-localhostIndex);
    }
    successCallback(url);
}

function requestAllPathsHandler(successCallback, errorCallback, module, event, args) {
    var pathsPrefix = {
        // Read-only directory where the application is installed.
        applicationDirectory: location.origin + '/',
        // Where to put app-specific data files.
        dataDirectory: 'filesystem:file:///persistent/',
        // Cached files that should survive app restarts.
        // Apps should not rely on the OS to delete files in here.
        cacheDirectory: 'filesystem:file:///temporary/',
    };

    successCallback(pathsPrefix);
}

module.exports = {
    'File': {
        '_getLocalFilesystemPath': _getLocalFilesystemPathHandler,
        'requestAllPaths': requestAllPathsHandler
    }
};
