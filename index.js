'use strict';
var chalk = require('chalk'),
  Filter = require('broccoli-filter'),
  filesize = require('filesize'),
  fs = require('fs'),
  merge = require('merge'),
  mkdirp = require('mkdirp'),
  path = require('path'),
  RSVP = require('rsvp'),
  symlinkOrCopy = require('symlink-or-copy'),
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

Filter.prototype.processFile = function processFile(srcDir, destDir, relativePath) {
  return this.readFile(path.join(srcDir, relativePath))
  .then(function(contents) {
    return this.processString(contents, relativePath);
  }.bind(this))
  .then(function asyncOutputFilteredFile() {
    var outputPath = this.getDestFilePath(relativePath);
    if (outputPath == null) {
      throw new Error('canProcessFile("' + relativePath + '") is true, but getDestFilePath("' + relativePath + '") is null');
    }
    mkdirp.sync(path.dirname(outputPath));
    this.copy(
      path.join(srcDir, relativePath),
      path.join(destDir, outputPath)
    );
  }.bind(this));
};

FileSizeFilter.prototype.readFile = function(path) {
  return new RSVP.Promise(function(resolve, reject) {
    fs.readFile(path, function(err, contents) {
      if (err) {
        reject(err);
      }
      else {
        resolve(contents);
      }
    });
  }.bind(this));
};

FileSizeFilter.prototype.processString = function(content, relativePath) {
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
    });
};

FileSizeFilter.prototype.copy = function(sourcePath, destPath) {
  var destDir = path.dirname(destPath);

  try {
    symlinkOrCopy.sync(sourcePath, destPath);
  } catch(e) {
    if (!fs.existsSync(destDir)) {
      mkdirp.sync(destDir);
    }
    try {
      fs.unlinkSync(destPath);
    } catch(e) {

    }
    symlinkOrCopy.sync(sourcePath, destPath);
  }
};

module.exports = FileSizeFilter;
