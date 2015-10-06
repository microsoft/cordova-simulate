// Copyright (c) Microsoft Corporation. All rights reserved.

/**
 * Interface to wrap the native File interface.
 *
 * This interface is necessary for creating zero-length (empty) files,
 * something the Filesystem API allows you to do. Unfortunately, File's
 * constructor cannot be called directly, making it impossible to instantiate
 * an empty File in JS.
 *
 * @param {Object} opts Initial values.
 * @constructor
 */
function MyFile(opts) {
    var blob_ = new Blob();

    this.size = opts.size || 0;
    this.name = opts.name || '';
    this.type = opts.type || '';
    this.lastModifiedDate = opts.lastModifiedDate || null;
    this.storagePath = opts.storagePath || '';

    // Need some black magic to correct the object's size/name/type based on the
    // blob that is saved.
    Object.defineProperty(this, 'blob_', {
        enumerable: true,
        get: function() {
            return blob_;
        },
        set: function(val) {
            blob_ = val;
            this.size = blob_.size;
            this.name = blob_.name;
            this.type = blob_.type;
            this.lastModifiedDate = blob_.lastModifiedDate;
        }.bind(this)
    });
}

MyFile.prototype.constructor = MyFile;

module.exports = MyFile;
