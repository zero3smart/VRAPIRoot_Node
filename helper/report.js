/**
 * Created by titu on 11/14/16.
 */

const _ = require('lodash');
const settings = require('../config/settings');
const commonHelper = require('./common');
const promise = require('bluebird');
const zipHelper = require('./zip');
const pdf = require('html-pdf');
const fileHelper = require('./file');

let saveReports = (report, directory, header) => {

    let cleanDirectory = directory + '/' + settings.cleanDirectory + '/';

    return promise.map(report.files, function (fileReport) {
        if (!fileReport.reports) {
            return;
        }
        else {
            let fileName = fileReport.fileName;
            let fileExtension = commonHelper.getFileExtension(fileName).toLowerCase();
            let fileNameWithoutExtension = fileName.split('.')[0];
            let handler = commonHelper.geFileHandler(fileExtension);
            let delimiter = null;
            return promise.map(fileReport.reports, function (reportToSave) {

                var data = _.map(reportToSave.data, function (d) {
                    return [d];
                });
                //write the report files
                return handler.save(data, cleanDirectory, (reportToSave.reportName + '_' + fileNameWithoutExtension), false, delimiter);
            })
                .then(() => {
                    //write the clean file
                    return handler.save(fileReport.data, cleanDirectory, ('CLEANED_' + fileNameWithoutExtension), header, delimiter);
                })
                .catch((e) => {
                    console.log('ERROR CATCHED IN REPORT - SAVE FILE!');
                    console.log(e);
                    throw e;
                });
        }
    })
        .then(() => {
            console.log('Creating PDF report');
            return createPDFReport(report, directory);
        })
        .then(() => {
            console.log('Zipping all the files');
            return zipHelper.zip(cleanDirectory, report.cleanId, 'zip');
        })
        .then(() => {
            console.log('Uploading the zip to FTP');
            return fileHelper.saveZipToFTP(report);
        }).catch((e) => {
            console.log('ERROR CATCHED IN REPORT!');
            console.log(e);
            throw e;
        });

};

let createPDFReport = (report, directory) => {

    let cleanDirectory = directory + '/' + settings.cleanDirectory + '/';
    let options = {
        "format": "Letter",
        /*"header": {
         "height": "1.5in",
         "contents": '<div style="text-align: center;">Email Scrubbing Report</div>'
         },*/
        "border": {
            "top": "0.5in",            // default is 0, units: mm, cm, in, px
            "right": "0.5in",
            "bottom": "0.5in",
            "left": "0.5in"
        }
    };
    let tableString = [
        '<table cellpadding="2" style="border: 0px">',
        keyValueRow('Customer:', report.userName),
        keyValueRow('Clean Id:', report.cleanId),
        keyValueRow('Date:', new Date()),
        keyValueRow('Total pre clean emails:', report.totalPreCleanRecords),
        keyValueRow('Total cleaned emails:', report.totalRecordsAfterClean),
        keyValueRow('Time required to clean:', report.timeRequired),
        '</table>'
    ].join('');
    console.log('directory: ', cleanDirectory);

    report.files.forEach(function (file) {
        tableString += [
            '<table cellpadding="5" class="border-table">',
            keyValueRow('File Name', file.fileName),
            keyValueRow('Pre clean emails', file.totalRecords),
            keyValueRow('Cleaned emails', file.data.length),
        ].join('');
        file.reports.forEach(function (fileReport) {
            tableString += keyValueRow((fileReport.reportName), fileReport.data.length)
        });

        tableString += '</table>'
    });

    let html = '<div class="title">Email Scrubbing Report</div>' + pdfHeaderTemplate + css + tableString + pdfFooterTemplate;

    console.log('html generation completed');

    return new promise(function (resolve, reject) {
        console.log('Calling pdf.reate');
        pdf.create(html, options).toFile(cleanDirectory + 'report.pdf', function (err, res) {
            if (err) {
                console.log('ERROR in PDF creation!');
                console.log(err);
                reject(err);
            }
            else {
                console.log('PDF creation completed. Calling resolve()');
                resolve();
            }
        });
    });

};

let keyValueRow = (key, value) => {
    return [
        '<tr>',
        '<td>' + key + '</td>',
        '<td>' + value + '</td>',
        '</tr>'
    ].join('');
};

let pdfHeaderTemplate = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<title>Title</title>',
    '</head>',
    '<body>'
].join('');

let css = [
    '<style>',
    '.title {text-align: center; margin-bottom: 50px;font-size: 14px; font-weight: bold;}',
    'body {font-family:Verdana,Georgia,Serif; }',
    'table {width: 100%;font-size:12px; margin: 15px 0px; }',
    'table.border-table { border-collapse:collapse; border:1px solid #000000;}',
    'table.border-table td { border:1px solid #000000; }',
    'thead { font-weight: bold; }',
    '</style>'
].join('');

let pdfFooterTemplate = [
    '</body>',
    '</html>',
].join('');

module.exports = {
    saveReports: saveReports
};
