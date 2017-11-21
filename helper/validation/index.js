/**
 * Created by titu on 10/24/16.
 */
const promise = require('bluebird');
const fileHelper = require('../file');
const csvHandler = require('./csv');
const xlxHandler = require('./xlx');
const syntaxValidation = require('./syntax');
const _ = require('lodash');

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
    let reports = [];

    return fileHelper.ensureDirectoryExists(uniqueDirectory)
        .then(() => handler.readFromFileAndRemoveDupes(filePath))
        .then((result)=>{
            if(result.report) {
                reports.push(result.report);
            }
            return syntaxValidation.validate(result.data);
        })
        .then((result) => {
            if(result.report) {
                reports.push(result.report);
            }
            printReport(reports);
            return result;
        })
        .then((result) => {
            return handler.save(result.data, uniqueFilePath)
        });
};

let getFileExtension = (fileName) => {
    return fileName.split('.').pop();
};

let printReport = (reports) => {
    _.each(reports, (report)=>{
        console.log('-----------');
        for(var key in report) {
            console.log(key, ' -> ', report[key]);
        }
    });

};

module.exports = {
    start: startValidation
};