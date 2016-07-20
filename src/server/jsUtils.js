// Copyright (c) Microsoft Corporation. All rights reserved.

var Q = require('q');

var DEFAULT_ASYNC_RETRY_ATTEMPTS = 2;

/**
 * Returns true if the specified objects are considered similar. Here, similarity is defined as having the same keys,
 * mapping to equal values (for value properties) or similar values (for arrays or nested objects). Does not correctly
 * support functions or nested arrays ([1,[2,3]]) - result will be invalid in these scenarios. Offers no protection
 * against circular objects. By default, order of object properties and array values is not important.
 *
 * @param {any} o1 The first object.
 * @param {any} o2 The second object.
 * @param {boolean=} compareOrder Whether order in object keys and array values should be considered.
 *
 * @returns {boolean} Whether the objects are similar.
 */
function compareObjects(o1, o2, compareOrder) {
    // If either are undefined, return false - don't consider undefined to equal undefined.
    if (typeof o1 === 'undefined' || typeof o2 === 'undefined') {
        return false;
    }

    // Strict comparison first, to compare values or object references.
    if (o1 === o2) {
        return true;
    }

    if (Array.isArray(o1)) {
        return compareArrays(o1, o2, compareOrder);
    }

    if (typeof o1 === 'object') {
        if (typeof o2 !== 'object') {
            return false;
        }

        var keys1 = Object.keys(o1);
        var keys2 = Object.keys(o2);

        return compareArrays(keys1, keys2, compareOrder) &&
            keys1.every(function (key) {
                return compareObjects(o1[key], o2[key]);
            });
    }

    // At this point the objects weren't strictly equal and are not of object type, so return false.
    return false;
}

/**
 * Returns true if the specified arrays are considered similar. Here, similarity is defined as having the same values.
 * Does not correctly support functions or nested arrays ([1,[2,3]]) - result will be invalid in these scenarios. By
 * default, order of values is not important ([1,2,3] and [3,2,1] are considered similar).
 *
 * @param {any[]} a1 The first array.
 * @param {any[]} a2 The second array.
 * @param {boolean=} compareOrder Whether order of values should be considered.
 *
 * @returns {boolean} Whether the arrays are similar.
 */
function compareArrays(a1, a2, compareOrder) {
    // If either are undefined, return false - don't consider undefined to equal undefined.
    if (typeof a1 === 'undefined' || typeof a2 === 'undefined') {
        return false;
    }

    if (!Array.isArray(a1) || !Array.isArray(a2) || a1.length !== a2.length) {
        return false;
    }

    // Strict comparison to compare references.
    if (a1 === a2) {
        return true;
    }

    if (compareOrder) {
        return a1.every(function (v, i) {
            return v === a2[i];
        });
    }

    var itemCounts = {};
    var isSimilar = true;

    a1.forEach(function (value) {
        if (!itemCounts[value]) {
            itemCounts[value] = 0;
        }

        ++itemCounts[value];
    });

    // Using Array.prototype.some() to break early if needed.
    a2.some(function (value) {
        if (!itemCounts[value]) {
            // If this value does not exist or its count is at 0, then a2 has an item that a1 doesn't have.
            isSimilar = false;
            return true;    // Return true to break early.
        }

        --itemCounts[value];
        return false;   // Return false to keep looking.
    });

    return isSimilar;
}

/**
 * Calls a function that returns a promise, then retries a certain number a times, after a timeout, if an error occurs.
 * @param {function} promiseFunc - The function to call.
 * @param {number} [maxTries=2] - The maximum number of tries before accepting failure. Defaults to 2.
 * @param {number} [delay=100] - The delay between retries in ms. Default to 100.
 * @returns {Promise}
 */
function retryAsync(promiseFunc, maxTries, delay, iteration) {
    maxTries = maxTries || DEFAULT_ASYNC_RETRY_ATTEMPTS;
    delay = delay || 100;
    iteration = iteration || 1;

    return promiseFunc().catch(function (err) {
        if (iteration < maxTries) {
            return Q.delay(delay)
                .then(function () {
                    return retryAsync(promiseFunc, maxTries, delay, iteration + 1);
                });
        }

        return Q.reject(err);
    });
}

module.exports.compareObjects = compareObjects;
module.exports.compareArrays = compareArrays;
module.exports.retryAsync = retryAsync;
