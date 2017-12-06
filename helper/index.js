/**
 * Created by titu on 10/24/16.
 */
const promise = require('bluebird');
const fileHelper = require('../file');
const csvHandler = require('./csv');
const xlxHandler = require('./xlx');
const syntaxValidation = require('./syntax');
const staticRemover = require('./staticlistremover/index');

let startValidation = (directory, files, header) => {
    return promise.map(files, function (file) {
        return readFileAndRemoveDuplicates(directory, file, header);
    }).then((result) => {
        return staticRemover.start(result, header);
    });
};

let readFileAndRemoveDuplicates = (directory, fileName, header) => {

    let filePath = directory + '/' + fileName;
    let uniqueDirectory = directory + '/unique/';
    let uniqueFilePath = uniqueDirectory + fileName;
    let handler = getHandler(getFileExtension(fileName).toLowerCase());
    let delimiter = null;

    return fileHelper.ensureDirectoryExists(uniqueDirectory)
        .then(() => handler.readFromFileAndRemoveDupes(filePath, header))
        .then((result) => {
            if(result.delimiter) {
                delimiter = result.delimiter;
            }

            return syntaxValidation.validate(result, header);
        })
        .then((result) => {
            if(result.report) {
                result.report.fileName = fileName;
            }
            return handler.save(result, uniqueFilePath, header, delimiter);
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