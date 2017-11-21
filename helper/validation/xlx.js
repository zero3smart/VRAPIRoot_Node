/**
 * Created by titu on 10/24/16.
 */
const promise = require('bluebird');
const fs = require('fs');
const csv = require('fast-csv');
const _ = require('lodash');
const parse = require('csv-parse');
const XLSX = promise.promisifyAll(require('xlsx'));

let readFromFileAndRemoveDupes = (filePath) => {

    return new promise((resolve, reject) => {
        let workbook = null;
        try {
            workbook = XLSX.readFile(filePath);
        }
        catch (e) {
            resolve([]);
        }
        let data = [];
        let uniqueOb = {};
        var sheetNames = workbook.SheetNames;
        var totalRecords = 0;
        var adr = null;

        sheetNames.forEach(function (sheetName) { /* iterate through sheets */
            var worksheet = workbook.Sheets[sheetName];
            for (var cell in worksheet) {
                /* all keys that do not begin with "!" correspond to cell addresses */
                if (cell[0] !== '!') {
                    adr = worksheet[cell].v ? worksheet[cell].v.toLowerCase() : null;
                    if (!uniqueOb[adr] && !_.isNil(adr)) {
                        uniqueOb[adr] = true;
                        data.push([adr]);
                    }
                    ++totalRecords;
                }
            }
        });

        console.log('-------------- Found records: ' + totalRecords + ', Unique data: ' + data.length);
        resolve({
            data: data,
            report: {
                type: 'duplicate',
                count: (totalRecords - data.length)
            }
        });
    });
};

let save = (data, filePath) => {
    return new promise(function (resolve, reject) {

        var wb = new Workbook(), ws = sheet_from_array_of_arrays(data);
        var ws_name = "SheetJS";
        var fileName = filePath.split('.');
        var extension = fileName.pop();

        if (extension.toLowerCase() !== 'xlsx') {
            filePath = filePath.replace(extension, 'xlsx');
        }

        wb.SheetNames.push(ws_name);
        wb.Sheets[ws_name] = ws;


        XLSX.writeFile(wb, filePath);

        resolve();
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