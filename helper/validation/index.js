/**
 * Created by titu on 10/24/16.
 */
const promise = require('bluebird');
const fileHelper = require('../file');
const csvHandler = require('./csv');
const xlxHandler = require('./xlx');

let startValidation = (directory, files) => {
    return promise.map(files, function (file) {
        return readFileAndRemoveDuplicates(directory, file);
    });
};

let readFileAndRemoveDuplicates = (directory, fileName) => {
    console.log('# parsing file: ' + fileName);

    let filePath = directory + '/' + fileName;
    let uniqueDirectory = directory + '/unique/';
    let uniqueFilePath = uniqueDirectory + fileName;
    let handler = getFileExtension(fileName).toLowerCase() === 'csv' ? csvHandler : xlxHandler;

    return fileHelper.ensureDirectoryExists(uniqueDirectory)
        .then(() => handler.readFromFileAndRemoveDupes(filePath))
        .then((uniqueData) => handler.save(uniqueData, uniqueFilePath));
};

let getFileExtension = (fileName) => {
    return fileName.split('.').pop();
};

module.exports = {
    start: startValidation
};