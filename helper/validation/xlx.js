/**
 * Created by titu on 10/24/16.
 */
const promise = require('bluebird');
const fs = require('fs');
const csvHelper = require('./csv');
const _ = require('lodash');
const parse = require('csv-parse');
const babyparse = require('babyparse');
const XLSX = promise.promisifyAll(require('xlsx'));

let readFromFileAndRemoveDupes = (filePath, header) => {

    return new promise((resolve, reject) => {
        let workbook = null;
        let containsHeader = false;
        let emailIndex = header.emailIndex || 0;
        let emailColumnHeader = null;
        try {
            workbook = XLSX.readFile(filePath, {sheetRows: 0});
        }
        catch (e) {
            resolve([]);
        }
        debugger;
        let data = [];
        let uniqueOb = {};
        var sheetNames = workbook.SheetNames;
        var totalRecords = 0;
        var adr = null;
        var value = null;
        if (_.isObject(header) && header.header === true) {
            containsHeader = true;
        }
        /*sheetNames.forEach(function (sheetName) { /!* iterate through sheets *!/
            var worksheet = workbook.Sheets[sheetName];
            for (var cell in worksheet) {
                /!* all keys that do not begin with "!" correspond to cell addresses *!/
                if (cell[0] !== '!') {
                    value = worksheet[cell].v;
                    adr = (value && _.isString(value)) ? value.toLowerCase() : value;
                    if (!uniqueOb[adr] && !_.isNil(adr)) {
                        uniqueOb[adr] = true;
                        data.push([adr]);
                    }
                    ++totalRecords;
                }
            }
        });*/

        /*1. {header: true} — when the file itself contains the header row.
        2. {firstname:0, lastname:1, email:2} — when the file doesn't contain the header row, but there are multiple columns.
        3. no header info object only in a case when the file contains only a single column with no header as row.
            So, if the file has the single column but a header row, then we need to send the header object like {header: true}*/


        /*
        When there is header in the file then can do the json; that is, {header : true}
         var jsonOb = XLSX.utils.sheet_to_json(workbook.Sheets["Sheet 1"]);
         */
        var parseData = null;

        debugger;

        if(containsHeader) {
            parseData = XLSX.utils.sheet_to_json(workbook.Sheets["Sheet1"]);
        }
        else {

            var csvData = babyparse.parse(XLSX.utils.sheet_to_csv(workbook.Sheets["Sheet1"]), {
                header: containsHeader,
                complete: (results) => {
                    debugger;
                    parseData = csvHelper.onParseComplete(results, header);
                    debugger;

                }
            });

        }
        /*
        When there is no header then we can convert the spreadsheet to csv
        //no header as row
        //no problem with any number of columns
        //header object can be defined to find the email column other wise take the first column
        //XLSX.utils.sheet_to_csv(workbook.Sheets["Sheet1"])
         */


        console.log((filePath.split('/')).pop());
        var tempData = getData(workbook)
        debugger;
        console.log('-------------- Found records: ' + totalRecords + ', Unique data: ' + data.length);
        resolve({
            data: data,
            report: {
                'totalRecords': totalRecords,
                'duplicate': (totalRecords - data.length)
            }
        });
    });
};

let getData = (workbook, headerInfo) => {

    var sheetNames = workbook.SheetNames;
    var worksheet = null;
    var csvPresentation = null;
    var csvData = null;

    sheetNames.forEach(function (sheetName) {
        worksheet = workbook.Sheets[sheetName];
    });

    headerInfo = headerInfo || {};

    if(headerInfo.header) {
        // so it is up to the file as it contains a header row
        return XLSX.utils.sheet_to_json(worksheet);
    }
    else {
        //the file doesn't contains the header row
        //need to find that if the headerInfo contains a mapping like {email: 2... }
        csvPresentation = XLSX.utils.sheet_to_csv(worksheet);
        csvData = babyparse.parse(csvPresentation).data;
        return csvData;

    }
};

let save = (result, filePath) => {
    return new promise(function (resolve, reject) {

        var wb = new Workbook(), ws = sheet_from_array_of_arrays(result.data);
        var ws_name = "SheetJS";
        var fileName = filePath.split('.');
        var extension = fileName.pop();

        if (extension.toLowerCase() !== 'xlsx') {
            filePath = filePath.replace(extension, 'xlsx');
        }

        wb.SheetNames.push(ws_name);
        wb.Sheets[ws_name] = ws;


        XLSX.writeFile(wb, filePath);

        resolve(result);
    });
};

module.exports = {
    readFromFileAndRemoveDupes: readFromFileAndRemoveDupes,
    save: save
};

function datenum(v, date1904) {
    if (date1904) v += 1462;
    var epoch = Date.parse(v);
    return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
}

function sheet_from_array_of_arrays(data, opts) {
    var ws = {};
    var range = {s: {c: 10000000, r: 10000000}, e: {c: 0, r: 0}};
    for (var R = 0; R != data.length; ++R) {
        for (var C = 0; C != data[R].length; ++C) {
            if (range.s.r > R) range.s.r = R;
            if (range.s.c > C) range.s.c = C;
            if (range.e.r < R) range.e.r = R;
            if (range.e.c < C) range.e.c = C;
            var cell = {v: data[R][C]};
            if (cell.v == null) continue;
            var cell_ref = XLSX.utils.encode_cell({c: C, r: R});

            if (typeof cell.v === 'number') cell.t = 'n';
            else if (typeof cell.v === 'boolean') cell.t = 'b';
            else if (cell.v instanceof Date) {
                cell.t = 'n';
                cell.z = XLSX.SSF._table[14];
                cell.v = datenum(cell.v);
            }
            else cell.t = 's';

            ws[cell_ref] = cell;
        }
    }
    if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
    return ws;
}
function Workbook() {
    if (!(this instanceof Workbook)) return new Workbook();
    this.SheetNames = [];
    this.Sheets = {};
}