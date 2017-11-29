/**
 * Created by titu on 10/24/16.
 */
const promise = require('bluebird');
const fileHelper = require('../file');
const csvHandler = require('./csv');
const xlxHandler = require('./xlx');
const syntaxValidation = require('./syntax');

let startValidation = (directory, files, header) => {
    return promise.map(files, function (file) {
        return readFileAndRemoveDuplicates(directory, file, header);
    });
};

let readFileAndRemoveDuplicates = (directory, fileName, header) => {
    console.log('# parsing file: ' + fileName);

    let filePath = directory + '/' + fileName;
    let uniqueDirectory = directory + '/unique/';
    let uniqueFilePath = uniqueDirectory + fileName;
    let handler = getHandler(getFileExtension(fileName).toLowerCase());

    return fileHelper.ensureDirectoryExists(uniqueDirectory)
        .then(() => handler.readFromFileAndRemoveDupes(filePath, header))
        .then(syntaxValidation.validate)
        .then((result) => {
            return handler.save(result, uniqueFilePath)
        });
};

let getFileExtension = (fileName) => {
    return fileName.split('.').pop();
};

let getHandler = (fileExtension) => {

    var handler = null;

    switch (fileExtension) {
        case 'txt':
        case 'csv':
        case 'tsv':
        case 'text':
            handler = csvHandler;
            break;
        case 'xlsm':
        case 'xlsx':
        case 'xls':
        case 'ods':
        case 'xlt':
            handler = xlxHandler;
            break;
    }
    return handler;
};

module.exports = {
    start: startValidation
};