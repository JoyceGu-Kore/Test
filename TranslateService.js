var _ = require('lodash');
var Promise = require('bluebird');
var request = require('request-promise');
var template = require('url-template');
var axios = require('axios');
var formurlencoded = require('form-urlencoded').default;
var translationUrl = 'https://nlp-translation.p.rapidapi.com/v1/translate'
var rapidApiKey = '86ab7c8fe7msh1b78a8757699603p11adf0jsn6b60333c92d3';
function TranslateService() {}

async function hello() {}

TranslateService.prototype.translate = async function translate(sourceText, sourceLanguage, targetLanguage) {
    var headers = {
        'content-type': 'application/x-www-form-urlencoded',
        'x-rapidapi-host': 'nlp-translation.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey
    };
    var formData = formurlencoded({
        from: sourceLanguage,
        text: sourceText,
        to:   targetLanguage
    });
    try {
        const translationResponse = await axios.post(translationUrl, formData, { headers: headers } );
        const data = translationResponse.data;
        if (!data) {
            console.log('No translation data in response');
            return null;
        }
        const translatedText = data.translated_text;
        if (!translatedText) {
            console.log('Missing translated_text in response');
            return null;
        }
        var targetTranslation = translatedText[targetLanguage];
        if(!targetTranslation) {
            console.log('The result was not translated into the target language');
            return null;
        }
        return targetTranslation;
    } catch (error) {
        console.log(error);
        return null;
    }
}


module.exports.getInstance = function getInstance() {
    return new TranslateService();
}
