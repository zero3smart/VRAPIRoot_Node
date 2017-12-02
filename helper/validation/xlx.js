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

        var parseData = null;

        if(containsHeader) {
            parseData = babyparse.unparse(XLSX.utils.sheet_to_json(workbook.Sheets["Sheet1"]));
            parseData = babyparse.parse(parseData, {
                header: containsHeader,
                complete: (results) => {
                    parseData = csvHelper.onParseComplete(results, header);
                }
            });
        }
        else {

            var csvData = babyparse.parse(XLSX.utils.sheet_to_csv(workbook.Sheets["Sheet1"]), {
                header: containsHeader,
                complete: (results) => {
                    parseData = csvHelper.onParseComplete(results, header);
                }
            });

        }

        console.log((filePath.split('/')).pop());
        /*resolve({
            data: parseData,
            report: {
                'totalRecords': totalRecords,
                'duplicate': (totalRecords - parseData.length)
            }
        });*/
        resolve(parseData);
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

let save = (result, filePath, header) => {
    return new promise(function (resolve, reject) {
        let containsHeader = false;
        let data = [];
        let temp = [];

        if (_.isObject(header) && header.header === true) {
            containsHeader = true;
            data = [];

            for (var key in result.data[0]) {
                temp.push(key);
            }

            data.push(temp);

            result.data.forEach(function (d) {
                temp = [];
                for(var key in d) {
                    temp.push(d[key]);
                }
                data.push(temp);
            });
        }
        else {
            data = result.data;
        }
        var wb = new Workbook();
        var ws = sheet_from_array_of_arrays(data);
        var ws_name = "Clean Sheet";
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