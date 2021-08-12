// Copyright (c) Microsoft Corporation. All rights reserved.

function DeferredPromise() {
    this._resolveSelf;
    this._rejectSelf;

    this._promise = new Promise((resolve, reject) => {
        this._resolveSelf = resolve;
        this._rejectSelf = reject;
    });

    Object.defineProperty(this, 'promise', {
        get: () => this._promise
    });
}

DeferredPromise.prototype.resolve = function(val) {
    this._resolveSelf(val);
};

DeferredPromise.prototype.reject = function(reason) {
    this._rejectSelf(reason);
};

module.exports = DeferredPromise;
