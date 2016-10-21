/**
 * Created by titu on 10/21/16.
 */
const promise = require('bluebird');
const fs = require('fs');
const csv = require('fast-csv');
const fileHelper = require('./file');
const _ = require('lodash');
const parse = require('csv-parse');

const excel = require('exceljs');

let startValidation = (directory, files) => {
    return promise.map(files, function (file) {
        return readFileAndRemoveDuplicates(directory, file);
    })
};

let readFileAndRemoveDuplicates = (directory, fileName) => {
    console.log('parsing file: ' + fileName);

    let filePath = directory + '/' + fileName;
    let uniqueDirectory = directory + '/unique/';
    let uniqueFilePath = uniqueDirectory + fileName;
    return fileHelper.ensureDirectoryExists(uniqueDirectory)
        .then(() => readFromFile(filePath))
        //.then(makeLowerCaseAndRemoveDuplicates)
        .then((uniqueData) => {
            return writeToFile(uniqueData, uniqueFilePath);
        });
};

let readFromFile = (filePath) => {
    let readStream = fs.createReadStream(filePath);
    let workbook = new excel.Workbook();
    let csvData = {};
    let uniqueData = [];

    return workbook.csv.read(readStream)
        .then(function(worksheet) {
            worksheet.eachRow(function (row) {
                if (_.isArray(row.values) && row.values && !csvData[row.values[1]]) {
                    row.values[1] = _.toLower(row.values[1]);
                    csvData[row.values[1]] = true;
                    uniqueData.push(row.values);
                }
            });
            return uniqueData;
        });
};

let writeToFile = (uniqueData, uniqueFilePath) => {
    return new promise(function (resolve, reject) {
        let writeStream = fs.createWriteStream(uniqueFilePath);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
        csv.write(uniqueData, {headers: true}).pipe(writeStream);
    });
};

module.exports = {
    start: startValidation
};

