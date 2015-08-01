'use strict';
var chalk = require('chalk'),
  Filter = require('broccoli-filter'),
  filesize = require('filesize'),
  merge = require('merge'),
  zlib = require('zlib');

function FileSizeFilter(inputTree, options) {
  if (!(this instanceof FileSizeFilter)) {
    return new FileSizeFilter(inputTree);
  }

  this.inputTree = inputTree;
  this.options = merge({
    gzipped: true,
    colors: true
  }, options);
}

FileSizeFilter.prototype = Object.create(Filter.prototype);
FileSizeFilter.prototype.constructor = FileSizeFilter;

FileSizeFilter.prototype.getDestFilePath = function (relativePath) {
  return relativePath;
};

FileSizeFilter.prototype.processString = function (content, relativePath) {
  var message = relativePath && chalk.yellow(relativePath)
    + ' => ' + chalk.green(filesize(content && content.length));

  if (this.options.gzipped) {
    var gzipped = zlib.gzipSync(new Buffer(content));
    message += ' ' + chalk.grey('(' + filesize(gzipped.length) + ' gzipped)\n');
  }

  process.stdout.write(this.options.colors ? message : chalk.stripColor(content));
  return content;
};

module.exports = FileSizeFilter;
