'use strict';

var FileSizePlugin = require('./');

module.exports = new FileSizePlugin(new FileSizePlugin('fixture'), { gzipped: false, colors: false });
