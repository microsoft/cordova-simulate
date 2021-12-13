// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    DOMParser = require('@xmldom/xmldom').DOMParser;

function parseXliffFile(xliffFile) {
    return parseXliff(fs.readFileSync(xliffFile, 'utf8'));
}

function parseXliff(xliff) {
    var xliffDoc = new DOMParser().parseFromString(xliff, 'text/xml');
    var xliffNode = getElementChild(xliffDoc, 'xliff');
    return getElementChildren(xliffNode, 'file').map(function (fileNode) {
        var result = {};
        result.original = fileNode.getAttribute('original');
        result.lang = fileNode.getAttribute('target-language');
        var items = {};
        result.items = items;

        var bodyNode = getElementChild(fileNode, 'body');
        var transUnitNodes = getElementChildren(bodyNode, 'trans-unit');
        transUnitNodes.forEach(function (transUnitNode) {
            var targetNode = getElementChild(transUnitNode, 'target');
            items[transUnitNode.getAttribute('id')] = {
                'text': getElementChild(transUnitNode, 'source').firstChild.data,
                'state': targetNode.getAttribute('state'),
                'stateQualifier': targetNode.getAttribute('state-qualifier'),
                'translatedText': targetNode.firstChild.data
            };
        });
        return result;
    });
}

function getElementChild(node, tagName) {
    var childNode = node.firstChild;
    while (childNode) {
        if (childNode.tagName === tagName) {
            return childNode;
        }
        childNode = childNode.nextSibling;
    }
    return null;
}

function getElementChildren(node, tagName) {
    var children = [];

    var childNode = node.firstChild;
    while (childNode) {
        if ((tagName && childNode.tagName === tagName) || (!tagName && childNode.tagName)) {
            children.push(childNode);
        }
        childNode = childNode.nextSibling;
    }
    return children;
}

/**
 *
 * @param xlfJsons
 * @returns {Document}
 */
function parseJson(xlfJsons) {
    var xliffDoc = new DOMParser().parseFromString('<?xml version="1.0" encoding="utf-8"?><xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:oasis:names:tc:xliff:document:1.2 xliff-core-1.2-transitional.xsd" version="1.2"></xliff>', 'text/xml');
    var xliffNode = getElementChild(xliffDoc, 'xliff');

    xlfJsons.forEach(function (xlfJson) {
        var targetLanguage = xlfJson.lang;

        var fileNode = xliffDoc.createElement('file');
        fileNode.setAttribute('original', xlfJson.original);
        fileNode.setAttribute('source-language', 'en');
        fileNode.setAttribute('target-language', targetLanguage);
        xliffNode.appendChild(fileNode);

        var bodyNode = xliffDoc.createElement('body');
        fileNode.appendChild(bodyNode);

        var items = xlfJson.items;
        var ids = Object.getOwnPropertyNames(items);

        // Create an array of strings to be translated, for machine translation
        var fromStrings = ids.map(function (id) {
            return items[id].text;
        });

        ids.forEach(function (id, index) {
            var item = items[id];

            var transUnitNode = xliffDoc.createElement('trans-unit');
            transUnitNode.setAttribute('id', id);
            bodyNode.appendChild(transUnitNode);

            createSourceNode(xliffDoc, transUnitNode, 'en', item.text);
            createTargetNode(xliffDoc, transUnitNode, targetLanguage, item.translatedText, item.state, item.stateQualifier);
        });
    });

    return xliffDoc;
}

function createSourceNode(xliffDoc, transUnitNode, lang, text) {
    return createSourceTargetNode(xliffDoc, transUnitNode, lang, text, true);
}

function createTargetNode(xliffDoc, transUnitNode, lang, text, state, stateQualifier) {
    var targetNode = createSourceTargetNode(xliffDoc, transUnitNode, lang, text, false);
    targetNode.setAttribute('state', state);
    if (stateQualifier) {
        targetNode.setAttribute('state-qualifier', stateQualifier);
    }
    return targetNode;
}

function createSourceTargetNode(xliffDoc, transUnitNode, lang, text, isSource) {
    var node = xliffDoc.createElement(isSource ? 'source' : 'target');
    node.setAttribute('xml:lang', lang);
    var textNode = xliffDoc.createTextNode(text);
    node.appendChild(textNode);
    transUnitNode.appendChild(node);
    return node;
}

module.exports = {
    parseXliffFile: parseXliffFile,
    parseXliff: parseXliff,
    parseJson: parseJson
};
