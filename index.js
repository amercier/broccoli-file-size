'use strict';

var fs = require('fs');
var util = require('util');
var path = require('path');
var zlib = require('zlib');

var chalk = require('chalk');
var filesize = require('filesize');
var merge = require('merge');
var Plugin = require('broccoli-plugin');
var Promise = require('rsvp').Promise;
var promisify = require('promisify-node');
var rimraf = require('rimraf');
var symlinkOrCopy = require('symlink-or-copy');
var walk = require('walk');

var pfs = {
  readFile: promisify(fs.readFile),
  stat: promisify(fs.stat),
};
var pzlib = {
  gzip: promisify(zlib.gzip),
};

function FileSizePlugin(inputNode, options) {
  if (!(this instanceof FileSizePlugin)) {
    return new FileSizePlugin(inputNode);
  }

  this.options = merge({
    gzipped: true,
    colors: true,
  }, options);

  Plugin.call(this, [inputNode], {
    annotation: this.options.annotation,
  });
}

util.inherits(FileSizePlugin, Plugin);

FileSizePlugin.prototype.build = function build() {
  var inputPath = this.inputPaths[0];

  // Symlink/copy input -> output
  this.copy(inputPath, this.outputPath);

  // Process output directory
  return new Promise(function processOutput(resolve, reject) {
    walk.walk(inputPath, { followLinks: true })
    .on('file', function onFile(root, stats, next) {
      var destDir = path.relative(inputPath, root);
      this.processFile(inputPath, destDir ? path.join(destDir, stats.name) : stats.name).then(next);
    }.bind(this))
    .on('errors', reject)
    .on('end', resolve);
  }.bind(this));
};

FileSizePlugin.prototype.copy = function copy(inputPath, outputPath) {
  try {
    symlinkOrCopy.sync(inputPath, outputPath);
  } catch (e) {
    if (fs.existsSync(outputPath)) {
      rimraf.sync(outputPath);
    }
    symlinkOrCopy.sync(inputPath, outputPath);
  }
};

FileSizePlugin.prototype.processFile = function processFile(dir, relativePath) {
  var absolutePath = path.join(dir, relativePath);
  if (this.options.gzipped) {
    return pfs.readFile(absolutePath).then(function processContents(contents) {
      return this.processString(relativePath, contents);
    }.bind(this));
  }
  return pfs.stat(absolutePath).then(function processStat(stat) {
    return this.processStats(relativePath, stat);
  }.bind(this));
};

FileSizePlugin.prototype.processStats = function processStats(relativePath, stats) {
  this.print(relativePath, stats.size);
};

FileSizePlugin.prototype.processString = function processString(relativePath, content) {
  if (this.options.gzipped) {
    return pzlib.gzip(content).then(function printGzippedContent(gzippedContent) {
      this.print(relativePath, content.toString().length, gzippedContent.toString().length);
    }.bind(this));
  }
  this.print(relativePath, filesize(content));
};

FileSizePlugin.prototype.print = function print(relativePath, size, gzippedSize) {
  var message = chalk.yellow(relativePath) + ' => ' + chalk.green(filesize(size));
  if (gzippedSize !== undefined) {
    message = message + ' ' + chalk.grey('(' + filesize(gzippedSize) + ' gzipped)');
  }
  if (!this.options.colors) {
    message = chalk.stripColor(message);
  }
  process.stdout.write(message + '\n');
};

module.exports = FileSizePlugin;
