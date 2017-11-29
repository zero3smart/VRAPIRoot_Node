/**
 * Created by titu on 10/24/16.
 */
const promise = require('bluebird');
const fs = require('fs');
const csv = require('fast-csv');
const _ = require('lodash');
const parse = require('csv-parse');
const babyparse = require('babyparse');
const global = require('../../config/global');

let readFromFileAndRemoveDupes = (filePath, header) => {
    let csvData = {};
    let uniqueData = [];
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;

    return new promise((resolve, reject) => {

        if (_.isObject(header) && header.header === true) {
            containsHeader = true;
        }

        babyparse.parseFiles(filePath, {
            header: containsHeader,
            complete: (results) => {
                resolve(onParseComplete(results, header));
            },
            complete1: function (results) {
                var data = results.data;
                /*if(results.meta) {
                 console.log('--- meta  ----')
                 console.log(results.meta)
                 }*/

                if (data && data.length) {

                    /*
                     Detect that if the data is in form of object or in array

                     if in Object then that is a key/value pair and confirms
                     to be a file parsed having header.

                     if in Array then a file which doesn't have header
                     */


                    if (containsHeader) { // So there is a header
                        //determine the email field name/column header for email
                        for (var key in data[0]) {
                            if (_.includes(global.emailKeyNames, key.toLowerCase())) {
                                emailColumnHeader = key;
                                break;
                            }
                        }
                        data.forEach(function (record) {
                            if (record[emailColumnHeader] && !csvData[record[emailColumnHeader]]) {
                                record[emailColumnHeader] = _.toLower(record[emailColumnHeader]);
                                csvData[record[emailColumnHeader]] = record;
                            }
                        });
                    }
                    else { // No header provided
                        data.forEach(function (record) {
                            if (record.length && !csvData[record[emailIndex]]) {
                                record[emailIndex] = _.toLower(record[emailIndex]);
                                csvData[record[emailIndex]] = record;
                            }
                        });
                    }

                    for (var key in csvData) {
                        if (csvData.hasOwnProperty(key)) {
                            uniqueData.push(csvData[key]);
                        }
                    }

                    console.log('-------------- Found records: ' + data.length + ', Unique data: ' + uniqueData.length);

                    debugger;
                    resolve({
                        data: uniqueData,
                        report: {
                            'totalRecords': data.length,
                            'duplicate': (data.length - uniqueData.length)
                        }
                    });
                }
                else {
                    resolve([]);
                }
            },
            error: function (err, file, inputElem, reason) {
                reject(err);
            },
        });

        //readStream.pipe(parser);
    });
};

let onParseComplete = (results, header) => {
    let csvData = {};
    let uniqueData = [];
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;
    let data = results.data;

    if (_.isObject(header) && header.header === true) {
        containsHeader = true;
    }
    /*if(results.meta) {
     console.log('--- meta  ----')
     console.log(results.meta)
     }*/

    if (data && data.length) {

        /*
         Detect that if the data is in form of object or in array

         if in Object then that is a key/value pair and confirms
         to be a file parsed having header.

         if in Array then a file which doesn't have header
         */


        if (containsHeader) { // So there is a header
            //determine the email field name/column header for email
            for (var key in data[0]) {
                if (_.includes(global.emailKeyNames, key.toLowerCase())) {
                    emailColumnHeader = key;
                    break;
                }
            }
            data.forEach(function (record) {
                if (record[emailColumnHeader] && !csvData[record[emailColumnHeader]]) {
                    record[emailColumnHeader] = _.toLower(record[emailColumnHeader]);
                    csvData[record[emailColumnHeader]] = record;
                }
            });
        }
        else { // No header provided
            data.forEach(function (record) {
                if (record.length && !csvData[record[emailIndex]]) {
                    record[emailIndex] = _.toLower(record[emailIndex]);
                    csvData[record[emailIndex]] = record;
                }
            });
        }

        for (var key in csvData) {
            if (csvData.hasOwnProperty(key)) {
                uniqueData.push(csvData[key]);
            }
        }

        console.log('-------------- Found records: ' + data.length + ', Unique data: ' + uniqueData.length);

        debugger;
        return {
            data: uniqueData,
            report: {
                'totalRecords': data.length,
                'duplicate': (data.length - uniqueData.length)
            }
        };
    }
    else {
        return [];
    }
};


let save = (result, filePath) => {
    return new promise(function (resolve, reject) {
        let writeStream = fs.createWriteStream(filePath);
        writeStream.on('error', reject);
        writeStream.on('finish', function () {
            resolve(result);
        });
        csv.write(result.data, {headers: true}).pipe(writeStream);
    });
};

module.exports = {
    readFromFileAndRemoveDupes: readFromFileAndRemoveDupes,
    onParseComplete: onParseComplete,
    save: save
};