/**
 * Created by titu on 10/17/16.
 */

const path = require('path');

module.exports = {
    allowedFileTypes: [
        'txt',
        'xlsm',
        'xlsx',
        'xls',
        'ods',
        'xlt',
        'csv',
        'tsv',
        'text'
    ],
    allowedZipeTypes: [
        'zip',
        //'rar',
        'tar',
        'gz',
        '7z',
        //'zipx'
        'tgz',
        'tar.gz'
    ]
};