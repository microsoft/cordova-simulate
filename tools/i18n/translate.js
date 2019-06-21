// Copyright (c) Microsoft Corporation. All rights reserved.

var chalk = require('chalk');
var MsTranslator = require('mstranslator');

var apiKey = process.env['CORDOVA-SIMULATE-TRANSLATE-API-KEY'];
var translateArray;

if (apiKey) {
    var translatorClient = new MsTranslator({
        api_key: apiKey
    }, true);

    translateArray = function (texts, targetLanguage) {
        return new Promise(function (resolve, reject) {
            var params = {
                texts: texts,
                from: 'en',
                to: targetLanguage
            };

            translatorClient.translateArray(params, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.map(function (item) {
                        return item.TranslatedText;
                    }));
                }
            });
        });
    }
} else {
    console.log(chalk.yellow.bold('Warning: Machine assisted translation is not enabled. To enable it, you need an Azure\n' +
        'account with Text Translation support active, then set the following environment variable:\n' +
        'CORDOVA-SIMULATE-TRANSLATE-API-KEY: Azure Text Translation key.'));

    translateArray = function (texts) {
        return Promise.resolve(texts.map(function (text) {
            return text
        }));
    }
}

module.exports = {
    translateArray: translateArray
};
