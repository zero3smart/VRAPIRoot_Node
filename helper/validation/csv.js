/**
 * Created by titu on 10/24/16.
 */
const promise = require('bluebird');
const fs = require('fs');
const csv = require('fast-csv');
const _ = require('lodash');
const parse = require('csv-parse');

let readFromFileAndRemoveDupes = (filePath) => {
    let readStream = fs.createReadStream(filePath);
    let csvData = {};
    let uniqueData = [];

    return new promise((resolve, reject) => {

        readStream.on("error", reject);

        let parser = parse({delimiter: ','}, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                if (data && data.length) {
                    data.forEach(function (record) {
                        if (_.isArray(record) && record.length && !csvData[record[0]]) {
                            record[0] = _.toLower(record[0]);
                            csvData[record[0]] = record;
                        }
                    });

                    for (var key in csvData) {
                        if (csvData.hasOwnProperty(key)) {
                            uniqueData.push(csvData[key]);
                        }
                    }

                    //console.log('-------------- Found records: ' + data.length + ', Unique data: ' + uniqueData.length);

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
            }

        });

        readStream.pipe(parser);
    });
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
    save: save
};