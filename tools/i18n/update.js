// Copyright (c) Microsoft Corporation. All rights reserved.

var fs = require('fs'),
    path = require('path'),
    chalk = require('chalk'),
    files = require('./files'),
    xliffConv = require('./xliff-json-conv'),
    parse5 = require('parse5'),
    pd = require('pretty-data').pd,
    XMLSerializer = require('xmldom').XMLSerializer,
    translate = require('./translate');

var translatedAttributes = ['label', 'caption', 'panel-label', 'read-label'];
var LOC_ID_ATTRIB = 'data-loc-id';
var inlineTags = ['a', 'abbr', 'acronym', 'applet', 'b', 'bdo', 'big', 'blink', 'br', 'cite', 'code', 'del', 'dfn', 'em', 'embed', 'face', 'font', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'map', 'nobr', 'object', 'param', 'q', 'rb', 'rbc', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'select', 'small', 'spacer', 'span', 'strike', 'strong', 'sub', 'sup', 'symbol', 'textarea', 'tt', 'u', 'var', 'wbr'];
var ignoreWords = [/\balpha\b/gi, /\bbeta\b/gi, /\bgamma\b/gi, /\bdeg\b/gi, /\bNE\b/gi, /\bNW\b/gi, /\bSE\b/gi, /\bSW\b/gi];
var singleCharRegex = /\b\S\b/g;
var nonAlphaRegex = /[^a-z]/gi;
var TRANSLATED = 'translated';
var NEEDS_TRANSLATION = 'needs-translation';
var MACHINE_SUGGESTION = 'mt-suggestion';
var htmlparser2TreeAdapter = parse5.treeAdapters.htmlparser2;

var langs = ['zh-Hans', 'zh-Hant', 'cs', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tr'];

var htmlRootPath = path.resolve(__dirname, '../../src');
var htmlFiles = files.findFiles(path.join(htmlRootPath, 'plugins'), 'html');

// Reads any 'xlf' files under this directory
var xliffRootPath = path.resolve(__dirname, 'xliff');
var xliffFiles = files.findFiles(xliffRootPath, 'xlf');

var xliffs = {};
xliffFiles.forEach(function (xliffFile) {
    var xlfJsons = xliffConv.parseXliffFile(xliffFile);
    xlfJsons.forEach(function (xlfJson) {
        // Delete xliffFile if original HTML file no longer exists
        if (htmlFiles.indexOf(path.resolve(htmlRootPath, xlfJson.original)) === -1) {
            files.removeFileAndDirectoryIfEmpty(xliffFile);
        } else {
            xliffs[xlfJson.lang] = xliffs[xlfJson.lang] || {};
            xliffs[xlfJson.lang][xlfJson.original] = xlfJson;
        }
    });
});

var langXliffs = {};
Promise.all(htmlFiles.map(function (htmlFile) {
    if (path.basename(htmlFile) === 'sim-host.html') {
        return;
    }

    var sourceHtmlRelativePath = path.relative(htmlRootPath, htmlFile);
    console.log('Processing source HTML file: ' + chalk.cyan(sourceHtmlRelativePath));

    var fragment = parse5.parseFragment(fs.readFileSync(htmlFile, 'utf8'), {treeAdapter: htmlparser2TreeAdapter});

    // Process all top-level tags
    var strings = [];
    var usedLocIds = {};
    fragment.children.forEach(function (child) {
        if (child.type === 'tag') {
            processTopLevelElement(child, strings, usedLocIds);
        }
    });

    // Update HTML file with any loc ids we might have added
    files.writeFileSync(htmlFile, parse5.serialize(fragment, {treeAdapter: htmlparser2TreeAdapter}));

    // Now that we've re-written the original source document, we'll be using fragment to write out translated versions.
    // Before we do that, insert a comment at the start.
    insertDoNotEditComment(fragment);

    // We will use this information for each language, so cache it now
    var stringsById = strings.reduce(function (previous, string) {
        previous[string.id] = string;
        return previous;
    }, {});

    return updateLanguageXlfJson(sourceHtmlRelativePath, strings)
        .then(function (result) {
            result.forEach(function (xlfJson) {
                // Add to the list of xlfJsons for this lang (so we can later build a single xlf file per lang)
                var lang = xlfJson.lang;
                langXliffs[lang] = langXliffs[lang] || [];
                langXliffs[lang].push(xlfJson);

                // Generate translated HTML file
                var htmlFile = path.resolve(__dirname, '../../src/i18n', lang, sourceHtmlRelativePath);
                applyTranslationsToDocument(xlfJson, stringsById);
                files.writeFileSync(htmlFile, parse5.serialize(fragment, {treeAdapter: htmlparser2TreeAdapter}));
            });
            console.log('HTML files updated for ' + chalk.cyan(sourceHtmlRelativePath));
        }).catch(function (err) {
            console.log('ERROR in updateLanguageXlfJson():\n' + err.stack);
        });
})).then(function () {
    langs.forEach(function (lang) {
        // Generate XLIFF file for this language
        var xlfFile = path.resolve(__dirname, 'xliff', lang + '.xlf');

        // Sort by file name so xliff file is constructed in a predictable order
        var langXliff = langXliffs[lang];

        // Recreate xliff if marked as dirty for any file
        if (langXliff.some(function (item) {return item.dirty})) {
            langXliff.sort(function (left, right) {
                return left.original < right.original ? -1 : 1;
            });

            var xliffDoc = xliffConv.parseJson(langXliff);
            files.writeFileSync(xlfFile, pd.xml(new XMLSerializer().serializeToString(xliffDoc)));
            console.log('XLIFF file updated: ' + chalk.cyan(lang));
        } else {
            console.log('XLIFF file unchanged: ' + chalk.cyan(lang));
        }
    });
});

function insertDoNotEditComment(fragment) {
    var commentNode = htmlparser2TreeAdapter.createCommentNode(' Do not edit this file. It is machine generated. ');
    var linebreakNode = createTextNode('\n');
    var targetNode;
    if (htmlparser2TreeAdapter.isCommentNode(fragment.firstChild)) {
        // Insert after initial comment
        targetNode = fragment.firstChild.nextSibling;
        htmlparser2TreeAdapter.insertBefore(fragment, linebreakNode, targetNode);
        htmlparser2TreeAdapter.insertBefore(fragment, commentNode, targetNode);
    } else {
        // Insert as first item
        targetNode = fragment.firstChild;
        htmlparser2TreeAdapter.insertBefore(fragment, commentNode, targetNode);
        htmlparser2TreeAdapter.insertBefore(fragment, linebreakNode, targetNode);
    }
}

function createTextNode(text) {
    // Oddly missing from parse5, so define it ourselves
    return {
        type: 'text',
        data: text,
        parent: null,
        prev: null,
        next: null
    };
}

function applyTranslationsToDocument(xlfJson, stringsById) {
    Object.getOwnPropertyNames(xlfJson.items).forEach(function (id) {
        var item = xlfJson.items[id];
        var string = stringsById[id];
        if (!string) {
            console.log(chalk.yellow.bold('Warning: Couldn\'t find information for loc id: ' + id));
            return;
        }

        var parentElement = string.parentElement;

        if (id.indexOf('-') > 0) {
            var attributeName = id.split('-')[0];
            parentElement.attribs[attributeName] = item.translatedText;
        } else {
            var newNodes = parse5.parseFragment(item.translatedText, {treeAdapter: htmlparser2TreeAdapter}).children;

            // We want to remove the child nodes stored for this string, and insert the generated nodes in
            // the same spot.
            var nextSibling;
            string.nodes.forEach(function (node) {
                if (node.parent === parentElement) {
                    nextSibling = node.nextSibling;
                    htmlparser2TreeAdapter.detachNode(node);
                }
            });

            // Since we re-use this same document for each language, update the stored child nodes for this
            // string with the ones we're about to insert.
            string.nodes = newNodes;

            // Insert the new nodes before the next sibling, or at the end if there is no next sibling
            newNodes.forEach(function (node) {
                if (nextSibling) {
                    htmlparser2TreeAdapter.insertBefore(parentElement, node, nextSibling);
                } else {
                    htmlparser2TreeAdapter.appendChild(parentElement, node);
                }
            });
        }
    });
}

function updateLanguageXlfJson(sourceHtmlRelativePath, strings) {
    return Promise.all(langs.map(function (lang) {
        var langJsons = xliffs[lang] || {};
        var xlfJson = langJsons[sourceHtmlRelativePath] || {dirty: true};
        var existingIDs = xlfJson.items ? Object.getOwnPropertyNames(xlfJson.items) : [];

        addXlfJsonProp(xlfJson, 'lang', lang);
        addXlfJsonProp(xlfJson, 'original', sourceHtmlRelativePath);
        addXlfJsonProp(xlfJson, 'items', {});

        var idsRequiringTranslation = [];

        strings.forEach(function (string) {
            var id = string.id;

            var pos = existingIDs.indexOf(id);
            if (pos > -1) {
                existingIDs.splice(pos, 1);
            }

            var existingValue = xlfJson.items[id];
            if (!existingValue || existingValue.text !== string.text) {
                xlfJson.items[id] = {text: string.text, state: NEEDS_TRANSLATION, stateQualifier: MACHINE_SUGGESTION};
                xlfJson.dirty = true;
                idsRequiringTranslation.push(id);
            } else if (existingValue.state === TRANSLATED && existingValue.stateQualifier === MACHINE_SUGGESTION) {
                // Remove 'mt-suggestion' state qualifier if item has been translated
                delete existingValue.stateQualifier;
                xlfJson.dirty = true;
            }
        });

        // If there are any ids left in existingIDs, they should be removed from xlfJson (which will mean they also get
        // removed from the xlf file).
        if (existingIDs.length) {
            xlfJson.dirty = true;
            existingIDs.forEach(function (id) {
                delete xlfJson.items[id];
            });
        }

        return applyTranslations(xlfJson.items, idsRequiringTranslation, lang).then(function () {
            return xlfJson;
        });
    }));
}

function addXlfJsonProp(xlfJson, propName, propValue) {
    if (!xlfJson[propName]) {
        xlfJson[propName] = propValue;
        xlfJson.dirty = true;
    }
}

function applyTranslations(items, idsRequiringTranslation, targetLanguage) {
    if (!idsRequiringTranslation.length) {
        return Promise.resolve();
    }

    var fromStrings = idsRequiringTranslation.map(function (id) {
        return items[id].text;
    });

    return translate.translateArray(fromStrings, targetLanguage).then(function (translatedTexts) {
        translatedTexts.forEach(function (translatedText, index) {
            var id = idsRequiringTranslation[index];
            items[id].translatedText = translatedText;
        });
    });
}

function processTopLevelElement(element, strings, usedLocIds) {
    processAttributes(element, strings);

    var currentText = {text: '', nodes: []};

    element.children.forEach(function (child) {
        processNode(child, strings, currentText, usedLocIds);
    });
    processCurrentText(strings, currentText, usedLocIds);
}

function processNode(node, strings, currentText, usedLocIds) {
    switch (node.type) {
        case 'text':
            currentText.nodes.push(node);
            currentText.text += node.data;
            break;

        case 'tag':
            // If tag is not an inline tag, or it has attributes, finish off currentText and start clean
            if (hasAttributes(node) || inlineTags.indexOf(node.name) == -1) {
                processCurrentText(strings, currentText, usedLocIds);
                processAttributes(node, strings);
                node.children.forEach(function (child) {
                    processNode(child, strings, currentText, usedLocIds);
                });
                processCurrentText(strings, currentText, usedLocIds);
                return;
            }
            currentText.nodes.push(node);
            currentText.text += serializeNode(node);
            break;

        default:
    }
}

function serializeNode(node) {
    // This extracts a node to a document fragment then serialized the fragment. We need to remember parent, prev and
    // next so we can restore them when we're done (appendChild() doesn't remove the node from its previous parent's
    // children, so we don't have to patch that).
    var parent = node.parent;
    var prev = node.prev;
    var next = node.next;

    var docFragment = htmlparser2TreeAdapter.createDocumentFragment();
    htmlparser2TreeAdapter.appendChild(docFragment, node);
    var result = parse5.serialize(docFragment, {treeAdapter: htmlparser2TreeAdapter});

    node.parent = parent;
    node.prev = prev;
    node.next = next;

    return result;
}

function processCurrentText(strings, currentText, usedLocIds) {
    var nodes = currentText.nodes;
    var text = currentText.text.trim();
    currentText.text = '';
    currentText.nodes = [];

    if (text && shouldTranslate(text)) {
        // TODO: Is there a scenario where the first node is not the lowest node? If not, should just use that here.
        var parentElement = findLowestNode(nodes).parent;

        var elementLocId = parentElement.attribs[LOC_ID_ATTRIB];
        if (!elementLocId) {
            elementLocId = applyId(parentElement);
        }

        // The loc id we use for the string is of the form <loc-id>:<n> to allow for multiple text blocks within the
        // same parent element.
        var locIdIndex = 1;
        var stringLocId;
        do {
            stringLocId = elementLocId + ":" + locIdIndex;
            locIdIndex++;
        } while (usedLocIds[stringLocId]);
        usedLocIds[stringLocId] = true;

        strings.push({id: stringLocId, text: text, parentElement: parentElement, nodes: nodes});
    }
}

function findLowestNode(nodes) {
    var lowestDepth = -1;
    var lowestNode = null;
    nodes.forEach(function (node) {
        var nodeDepth = getNodeDepth(node);
        if (!lowestNode || nodeDepth < lowestDepth) {
            lowestNode = node;
            lowestDepth = nodeDepth;
        }
    });
    return lowestNode;
}

function getNodeDepth(node) {
    var depth = 0;
    var parentNode = node.parent;
    while (parentNode) {
        depth++;
        parentNode = parentNode.parent;
    }
    return parentNode;
}

function shouldTranslate(text) {
    // Remove stuff we wouldn't translate, and see if we have anything left

    // Replace non-alpha
    text = text.replace(nonAlphaRegex, ' ');

    // Remove single characters
    text = text.replace(singleCharRegex, ' ');

    // Replace ignored words
    ignoreWords.forEach(function (word) {
        text = text.replace(word, ' ');
    });

    return !!text.trim();
}

function hasAttributes(element) {
    return !!Object.getOwnPropertyNames(element.attribs).length;
}

function processAttributes(element, strings) {
    if (!hasAttributes(element)) {
        return null;
    }

    var attributes = element.attribs;
    var locId = attributes[LOC_ID_ATTRIB];
    translatedAttributes.forEach(function (translatedAttribute) {
        var attValue = attributes[translatedAttribute];
        if (attValue && shouldTranslate(attValue)) {
            if (!locId) {
                locId = applyId(element)
            }
            strings.push({id: translatedAttribute + '-' + locId, text: attValue, parentElement: element});
        }
    });
}

function getId() {
    var result = [];
    for (var i = 0; i < 8; i++) {
        result.push((Math.random() * 16 | 0).toString(16));
    }
    return result.join('');
}

function applyId(element) {
    var id = getId();
    element.attribs[LOC_ID_ATTRIB] = id;
    return id;
}
