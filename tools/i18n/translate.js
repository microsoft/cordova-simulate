// Copyright (c) Microsoft Corporation. All rights reserved.

var chalk = require('chalk');
var MsTranslator = require('mstranslator');

var clientId = process.env['CORDOVA-SIMULATE-TRANSLATE-CLIENT-ID'];
var clientSecret = process.env['CORDOVA-SIMULATE-TRANSLATE-CLIENT-SECRET'];
var translateArray;

if (clientId && clientSecret) {
    var translatorClient = new MsTranslator({
        client_id: clientId,
        client_secret: clientSecret
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
    console.log(chalk.yellow.bold('Warning: Machine assisted translation is not enabled. To enable it, you need an account\n' +
        'and app registered with the Azure DataMarket, with Microsoft Translator Text Translation\n' +
        'support active, then set the following environment variables:\n' +
        'CORDOVA-SIMULATE-TRANSLATE-CLIENT-ID: Azure DataMarket application Client ID.\n' +
        'CORDOVA-SIMULATE-TRANSLATE-CLIENT-SECRET: Azure DataMarket application Client Secret.'));

    translateArray = function (texts) {
        return Promise.resolve(texts.map(function (text) {
            return text
        }));
    }
}

module.exports = {
    translateArray: translateArray
};