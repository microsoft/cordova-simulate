// Copyright (c) Microsoft Corporation. All rights reserved.
// Based in part on code from Vogue (https://github.com/andrewdavey/vogue)

var url = require('url');

var liveReloadEvents = {
    CAN_REFRESH: 'lr-can-refresh',
    REFRESH_FILE: 'lr-refresh-file',
    FULL_RELOAD: 'lr-full-reload'
}

var URL_ATTRIB_NAME = 'url';
var HREF_ATTRIB_NAME = 'href';
var SRC_ATTRIB_NAME = 'src';
var referenceAttributes = [
    URL_ATTRIB_NAME,
    HREF_ATTRIB_NAME,
    SRC_ATTRIB_NAME
];

module.exports.start = function (sock) {
    var head = document.getElementsByTagName('head')[0];
    var serverUrl = window.location.protocol + '//' + window.location.host;
    var localUrlPrefixes = [
        serverUrl,
        serverUrl + '/',
        '/',
        ''
    ];
    var pendingFilesToRefresh = {};
    var stylesheets;
    var socket = sock;

    /**
     * Reload the page. Currently, only does a naive window.location.reload().
     */
    function reloadPage() {
        window.location.reload(true);
    }

    /**
     * Returns the name of the reference attribute (either "url", "href" or "src") that is defined for the given node. If the node defines more than one, returns the first encountered, in that order.
     *
     * @param {Element} domNode The DOM node to check.
     * @returns {String} "url", "href" or "src", or null if none of these attributes is defined.
     */
    function getReferenceAttributeForNode(domNode) {
        if (domNode.getAttribute(URL_ATTRIB_NAME)) {
            return URL_ATTRIB_NAME;
        }

        if (domNode.getAttribute(HREF_ATTRIB_NAME)) {
            return HREF_ATTRIB_NAME;
        }

        if (domNode.getAttribute(SRC_ATTRIB_NAME)) {
            return SRC_ATTRIB_NAME;
        }

        return null;
    }

    /**
     * Checks whether the given URL corresponds to a given file path from the server.
     *
     * @param {String} url The URL to check.
     * @param {String} fileRelativePath The path of the modified file to check, relative to the webRoot.
     * @returns {boolean} Whether the URL points to the modified file from the server.
     */
    function urlMatchesPath(url, fileRelativePath) {
        var isMatch = false;

        localUrlPrefixes.find(function (prefix) {
            isMatch = prefix + fileRelativePath === url;

            return isMatch;
        });

        return isMatch;
    }

    /**
     * Finds all the DOM elements that have a reference attribute ("url", "href" or "src") pointing to the given relative path. Excludes <script> tags. 
     *
     * @param {String} fileRelativePath The URL of the file to check, relative to the webRoot.
     * @returns {{ domNode: Element, referenceAttribute: string }[]} An array of "resources" referencing the given file.
     */
    function findDomNodesForFilePath(fileRelativePath) {
        // To use querySelectorAll to query elements based on their attributes, the selector's syntax is: '[attrib1], [attrib2], ...'.
        var selectorString = `[${referenceAttributes.join('], [')}]`;
        var rawNodes = document.querySelectorAll(selectorString);
        var filteredNodes = [];

        // querySelectorAll() does not return an array, so we can't use Array.prototype.filter().
        for (var i = 0; i < rawNodes.length; ++i) {
            var currentNode = rawNodes[i];

            // Ignore <script> tags (we need to do a full reload for scripts).
            if (currentNode.tagName.toLowerCase() === 'script') {
                continue;
            }

            // Verify if the node is referencing the modified file
            var referenceAttribute = getReferenceAttributeForNode(currentNode);
            var nodeReference = currentNode.getAttribute(referenceAttribute);

            // If the node's url / href / src doesn't reference the modified file on the server, ignore the node.
            if (!urlMatchesPath(url.parse(nodeReference).pathname, fileRelativePath)) {
                continue;
            }

            // We care about this node.
            filteredNodes.push({
                domNode: currentNode,
                referenceAttribute: referenceAttribute
            });
        }

        return filteredNodes;
    }

    /**
     * Determines whether a file can be refreshed without a full page reload, and notifies the server. If the file can be refreshed, stores the relevant info in the list of pending files to refresh.
     *
     * @param {String} fileRelativePath The URL of the file to be refreshed, relative to the webRoot.
     */
    function prepareRefresh(fileRelativePath) {
        var associatedNodes = findDomNodesForFilePath(fileRelativePath);
        var canRefresh = false;

        if (associatedNodes.length) {
            pendingFilesToRefresh[fileRelativePath] = associatedNodes;
            canRefresh = true;
        }

        socket.emit(liveReloadEvents.CAN_REFRESH, { fileRelativePath: fileRelativePath, canRefresh: canRefresh });
    }

    /**
     * Refreshes a file by updating the associated nodes' querystring with a new _livereload parameter.
     *
     * @param {String} fileRelativePath The URL of the file to be refreshed, relative to the webRoot.
     */
    function refreshFile(fileRelativePath) {
        var nodesToRefresh = pendingFilesToRefresh[fileRelativePath];
        var mustFindNodesAgain = !nodesToRefresh || !nodesToRefresh.length || nodesToRefresh.find(function (resource) {
            return !resource.domNode || !resource.referenceAttribute || !resource.domNode.getAttribute(resource.referenceAttribute);
        });

        if (mustFindNodesAgain) {
            // For some reason, the info we previously stored about the file's associated nodes is no longer valid, so find the relevant nodes again.
            nodesToRefresh = findDomNodesForFilePath(fileRelativePath);
        }

        if (!nodesToRefresh) {
            // The modified file doesn't appear to be referenced in the DOM anymore. Do a full reload.
            reloadPage();

            return;
        }

        // Update the nodes' url / href / src attribute with a new _livereload querystring parameter.
        nodesToRefresh.forEach(function (nodeInfo) {
            var previousUrl = nodeInfo.domNode.getAttribute(nodeInfo.referenceAttribute);
            var parsedUrl = url.parse(previousUrl, true);

            parsedUrl.query._livereload = (new Date).getTime();
            delete parsedUrl.search;
            nodeInfo.domNode.setAttribute(nodeInfo.referenceAttribute, url.format(parsedUrl));
        });

        // Now that we've updated the necessary nodes, remove the file from the pending refreshes.
        delete pendingFilesToRefresh[fileRelativePath];
    }

    socket.on(liveReloadEvents.CAN_REFRESH, function (data) {
        prepareRefresh(data.fileRelativePath);
    });
    socket.on(liveReloadEvents.REFRESH_FILE, function (data) {
        refreshFile(data.fileRelativePath);
    });
    socket.on(liveReloadEvents.FULL_RELOAD, function () {
        reloadPage();
    });
};
