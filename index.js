'use strict';
var chalk = require('chalk'),
  Filter = require('broccoli-filter'),
  filesize = require('filesize'),
  merge = require('merge'),
  RSVP = require('rsvp'),
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
    + ' => ' + chalk.green(filesize(content && content.length)),
    options = this.options;

  return new RSVP.Promise(function(resolve, reject) {
      if (options.gzipped) {
        zlib.gzip(new Buffer(content), function(err, result) {
          if (err) {
            return reject(err);
          }
          resolve(message + ' ' + chalk.grey('(' + filesize(result.length) + ' gzipped)\n'));
        });
      }
      else {
        resolve(message);
      }
    })
    .then(function(message) {
      process.stdout.write(options.colors ? message : chalk.stripColor(content));
      return content;
    });
};

module.exports = FileSizeFilter;
