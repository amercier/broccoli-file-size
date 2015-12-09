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
      var destDir = path.relative(inputPath, root);
      this.processFile(inputPath, destDir ? path.join(destDir, stats.name) : stats.name).then(next);
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
  var absolutePath = path.join(dir, relativePath);
  if (this.options.gzipped) {
    return this.readFile(absolutePath).then(function(contents) {
      return this.processString(relativePath, contents);
    }.bind(this));
  }
  else {
    return this.statFile(absolutePath).then(function(stat) {
      return this.processStats(relativePath, stat);
    }.bind(this));
  }
};

FileSizePlugin.prototype.statFile = function statFile(path) {
  return new Promise(function(resolve, reject) {
    fs.stat(path, function(err, stats) {
      if (err) {
        reject(err);
      }
      else {
        resolve(stats);
      }
    });
  }.bind(this));
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

FileSizePlugin.prototype.processStats = function(relativePath, stats) {
  this.print(relativePath, stats.size);
};

FileSizePlugin.prototype.processString = function processString(relativePath, content) {
  if (this.options.gzipped) {
    return this.gzip(content).then(function(gzippedContent) {
      this.print(relativePath, content.toString().length, gzippedContent.toString().length);
    }.bind(this));
  }
  else {
    this.print(relativePath, filesize(content));
  }
};

FileSizePlugin.prototype.gzip = function(content) {
  return new Promise(function(resolve, reject) {
    zlib.gzip(new Buffer(content), function(err, result) {
      if (err) {
        reject(err);
      }
      else {
        resolve(result);
      }
    });
  }.bind(this));
}

FileSizePlugin.prototype.print = function print(relativePath, size, gzippedSize) {
  var message = chalk.yellow(relativePath) + ' => ' + chalk.green(filesize(size));
  if (gzippedSize !== undefined) {
    message = message + ' ' + chalk.grey('(' + filesize(gzippedSize) + ' gzipped)');
  }
  if (!this.options.colors) {
    message = chalk.stripColor(message);
  }
  process.stdout.write(message + '\n');
}

module.exports = FileSizePlugin;
