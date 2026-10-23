// The library from the parent directory, linked as if it were installed.
const path = require('path');
const pkg = require('../package.json');

module.exports = {
    dependencies: {
        [pkg.name]: { root: path.join(__dirname, '..') },
    },
};
