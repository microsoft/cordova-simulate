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

var translatedAttributes = ['label', 'caption'];
var LOC_ID_ATTRIB = 'data-loc-id';
var inlineTags = ['a', 'abbr', 'acronym', 'applet', 'b', 'bdo', 'big', 'blink', 'br', 'cite', 'code', 'del', 'dfn', 'em', 'embed', 'face', 'font', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'map', 'nobr', 'object', 'param', 'q', 'rb', 'rbc', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'select', 'small', 'spacer', 'span', 'strike', 'strong', 'sub', 'sup', 'symbol', 'textarea', 'tt', 'u', 'var', 'wbr'];
var ignoreWords = [/\balpha\b/gi, /\bbeta\b/gi, /\bgamma\b/gi, /\bdeg\b/gi];
var singleCharRegex = /\b\S\b/g;
var nonAlphaRegex = /[^a-z]/gi;
var NEEDS_TRANSLATION = 'needs-translation';
var MACHINE_SUGGESTION = 'mt-suggestion';
var htmlparser2TreeAdapter = parse5.treeAdapters.htmlparser2;

var langs = ['zh-CHS', 'zh-CHT', 'cs', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tr'];

var htmlRootPath = path.resolve(__dirname, '../../src');
var htmlFiles = files.findFiles(htmlRootPath, 'html');

// Reads and 'xlf' files under this directory
var xliffRootPath = path.resolve(__dirname, 'xliff');
var xliffFiles = files.findFiles(xliffRootPath, 'xlf');

var xliffs = {};
xliffFiles.forEach(function (xliffFile) {
    var xlfJson = xliffConv.parseXliffFile(xliffFile);
    // Delete xliffFile if original HTML file no longer exists
    if (htmlFiles.indexOf(path.resolve(htmlRootPath, xlfJson.original)) === -1) {
        files.removeFileAndDirectoryIfEmpty(xliffFile);
    } else {
        xliffs[xlfJson.lang] = xliffs[xlfJson.lang] || {};
        xliffs[xlfJson.lang][xlfJson.original] = xlfJson;
    }
});

htmlFiles.forEach(function (htmlFile) {
    if (path.basename(htmlFile) === 'sim-host.html') {
        return;
    }

    var sourceHtmlRelativePath = path.relative(htmlRootPath, htmlFile);
    console.log('Processing source HTML file: ' + chalk.cyan(sourceHtmlRelativePath));

    var strings = [];
    var fragment = parse5.parseFragment(fs.readFileSync(htmlFile, 'utf8'), {treeAdapter: htmlparser2TreeAdapter});

    // Process all top-level tags
    fragment.children.forEach(function (child) {
        if (child.type === 'tag') {
            processTopLevelElement(child, strings);
        }
    });

    // Update HTML file with any loc ids we might have added
    fs.writeFileSync(htmlFile, parse5.serialize(fragment, {treeAdapter: htmlparser2TreeAdapter}), 'utf8');

    updateLanguageXlfJson(sourceHtmlRelativePath, strings).then(function (result) {
        result.forEach(function (xlfJson) {
            // Generate XLIFF file
            var xlfFile = path.resolve(__dirname, 'xliff', xlfJson.lang, sourceHtmlRelativePath) + '.xlf';
            var xliffDoc = xliffConv.parseJson(xlfJson);

            var directory = path.dirname(xlfFile);
            if (!files.existsSync(directory)) {
                files.makeDirectoryRecursiveSync(directory);
            }
            fs.writeFileSync(xlfFile, pd.xml(new XMLSerializer().serializeToString(xliffDoc)), 'utf8');

            // Generate JSON files used for localization at runtime
            var jsonFile = path.resolve(__dirname, '../../src/i18n', xlfJson.lang, sourceHtmlRelativePath) + '.i18n.json';
            var i18nJson = [];
            Object.getOwnPropertyNames(xlfJson.items).forEach(function (id) {
                var item = xlfJson.items[id];
                var i18nJsonItem = {
                    source: item.text,
                    target: item.translatedText
                };
                if (id.indexOf('-') > 0) {
                    i18nJsonItem.attribute = id.split('-')[0];
                }
                i18nJson.push(i18nJsonItem);
            });

            directory = path.dirname(jsonFile);
            if (!files.existsSync(directory)) {
                files.makeDirectoryRecursiveSync(directory);
            }
            fs.writeFileSync(jsonFile, JSON.stringify(i18nJson, null, '  '), 'utf8');
        });
        console.log('XLIFF and JSON files updated for ' + chalk.cyan(sourceHtmlRelativePath));
    }).catch(function (err) {
        console.log('ERROR in updateLanguageXlfJson():\n' + err.stack);
    });
});

function updateLanguageXlfJson(sourceHtmlRelativePath, strings) {
    return Promise.all(langs.map(function (lang) {
        var langJsons = xliffs[lang] || {};
        var xlfJson = langJsons[sourceHtmlRelativePath] || {};

        xlfJson.lang = xlfJson.lang || lang;
        xlfJson.original = xlfJson.original || sourceHtmlRelativePath;
        xlfJson.items = xlfJson.items || {};

        var idsRequiringTranslation = [];

        strings.forEach(function (string) {
            // {type: 'text', id: locId, text: txt}
            var id = string.id;
            var existingValue = xlfJson.items[id];

            if (!existingValue || existingValue.text !== string.text) {
                xlfJson.items[id] = {text: string.text, state: NEEDS_TRANSLATION, stateQualifier: MACHINE_SUGGESTION};
                idsRequiringTranslation.push(id);
            }
        });

        return applyTranslations(xlfJson.items, idsRequiringTranslation, lang).then(function () {
            return xlfJson;
        });
    }));
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

function processTopLevelElement(element, strings) {
    var currentText = '';

    processAttributes(element, strings);

    var context = {
        currentText: '',
        ownerElement: element
    };

    element.children.forEach(function (child) {
        processNode(child, strings, context);
    });
    processCurrentText(strings, context);
}

function processNode(node, strings, context) {
    switch (node.type) {
        case 'text':
            context.currentText += node.data;
            break;

        case 'tag':
            // If tag is not an inline tag, or it has attributes, finish off currentText and start clean
            if (hasAttributes(node) || inlineTags.indexOf(node.name) == -1) {
                processCurrentText(strings, context);
                processAttributes(node, strings);
                context.ownerElement = node;
                node.children.forEach(function (child) {
                    processNode(child, strings, context);
                });
                processCurrentText(strings, context);
                return;
            }
            context.currentText += serializeNode(node);
            break;

        default:
    }
}

function serializeNode(node) {
    var docFragment = htmlparser2TreeAdapter.createDocumentFragment();
    htmlparser2TreeAdapter.appendChild(docFragment, node);
    return parse5.serialize(docFragment, {treeAdapter: htmlparser2TreeAdapter});
}

function processCurrentText(strings, context) {
    var txt = context.currentText.trim();
    context.currentText = '';

    if (txt && shouldTranslate(txt)) {
        var locId = context.ownerElement.attribs[LOC_ID_ATTRIB];
        if (!locId) {
            locId = applyId(context.ownerElement);
        }
        strings.push({type: 'text', id: locId, text: txt});
    }
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
            strings.push({type: 'attribute', id: translatedAttribute + '-' + locId, text: attValue});
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
