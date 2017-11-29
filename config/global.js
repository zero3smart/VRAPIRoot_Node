/**
 * Created by titu on 10/17/16.
 */

const path = require('path');

module.exports = {
    userUploadsDir: path.resolve(__dirname, '../useruploads'),
    emailKeyNames: [
        'email',
        'emailaddress',
        'mail'
    ]
};