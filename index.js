'use strict';

var fs = require('fs'),
  util = require('util'),
  path = require('path'),
  zlib = require('zlib');

var chalk = require('chalk'),
  filesize = require('filesize'),
  merge = require('merge'),
  Plugin = require('broccoli-plugin'),
  Promise = require('rsvp').Promise,
  rimraf = require('rimraf'),
  symlinkOrCopy = require('symlink-or-copy'),
  walk = require('walk');

function FileSizePlugin(inputNode, options) {
  if (!(this instanceof FileSizePlugin)) {
    return new FileSizePlugin(inputNode);
  }

  this.options = merge({
    gzipped: true,
    colors: true
  }, options);

  Plugin.call(this, [inputNode], {
    annotation: this.options.annotation
  });
}

util.inherits(FileSizePlugin, Plugin);

FileSizePlugin.prototype.build = function() {
  var inputPath = this.inputPaths[0];

  // Symlink/copy input -> output
  this.copy(inputPath, this.outputPath);

  // Process output directory
  return new Promise(function(resolve, reject) {
    walk.walk(inputPath)
    .on('file', function(root, stats, next) {
      this.processFile(root, stats.name).then(next);
    }.bind(this))
    .on('errors', reject)
    .on('end', resolve);
  }.bind(this));
};

FileSizePlugin.prototype.copy = function(inputPath, outputPath) {
  try {
    symlinkOrCopy.sync(inputPath, outputPath);
  } catch(e) {
    if (fs.existsSync(outputPath)) {
      rimraf.sync(outputPath);
    }
    symlinkOrCopy.sync(inputPath, outputPath);
  }
};

FileSizePlugin.prototype.processFile = function processFile(dir, relativePath) {
  return this.readFile(path.join(dir, relativePath))
  .then(function(contents) {
    return this.processString(contents, relativePath);
  }.bind(this))
};

FileSizePlugin.prototype.readFile = function readFile(path) {
  return new Promise(function(resolve, reject) {
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

FileSizePlugin.prototype.processString = function processString(content, relativePath) {
  var message = relativePath && chalk.yellow(relativePath)
    + ' => ' + chalk.green(filesize(content && content.length)),
    options = this.options;

  return new Promise(function(resolve, reject) {
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

module.exports = FileSizePlugin;
