import { existsSync, readFile, stat } from 'fs';
import { join, relative } from 'path';
import { gzip } from 'zlib';

import Promise, { promisify, resolve } from 'bluebird';
import { green, grey, stripColor, yellow } from 'chalk';
import filesize from 'filesize';
import { isArray, isUndefined, merge } from 'lodash';
import Plugin from 'broccoli-plugin';
import rimraf from 'rimraf';
import symlinkOrCopy from 'symlink-or-copy';
import walk from 'walk';

const [preadFile, pstat, pgzip] = [readFile, stat, gzip].map(promisify);

/**
 * Lists files of a directory recursively. Follows symbolic links.
 * @param {String} dir Directory to scan
 * @param {Function()} callback Callback executed when a file is found. Can return a Promise.
 * @return {Promise} A new promise that is resolved once the given directory
 * has been scanned entirely and all callbacks have completed.
 */
function listFiles(dir, callback) {
  return new Promise((resolveThis, reject) => {
    walk.walk(dir, { followLinks: true })
    .on('file', (root, stats, next) => {
      const destDir = relative(dir, root);
      const relativePath = destDir ? join(destDir, stats.name) : stats.name;
      resolve(relativePath).then(callback).then(next);
    })
    .on('errors', reject)
    .on('end', resolveThis);
  });
}

/**
 * Symlink or copy a directory
 * @param {String} dir Path to an existing
 * @param {String} target Path of the symlink to create
 */
function symlinkOrCopySync(dir, target) {
  try {
    symlinkOrCopy.sync(dir, target);
  } catch (e) {
    if (existsSync(target)) {
      rimraf.sync(target);
    }
    symlinkOrCopy.sync(dir, target);
  }
}

/**
 * A Broccoli plugin that display sizes of all files found in its input path.
 */
export default class FileSizePlugin extends Plugin {

  /**
   * Create a new FileSizePlugin instances
   * @param {Node|Node[]} inputNodes Input nodes, see `broccoli-plugin` docs
   * @param {Object} options Plugin options
   */
  constructor(inputNodes, options) {
    super(isArray(inputNodes) ? inputNodes : [inputNodes], options);

    /**
     * Broccoli plugin options
     * @type {Object}
     * @property {Boolean} [gzipped=true] Whether to display gzipped size or not
     * @property {Boolean} [colors=true] Whether to use colors or not
     */
    this.options = merge({
      gzipped: true,
      colors: true,
    }, options);
  }

  /**
   * Builds this node.
   *
   * Symlinks the first input path to this node's output path, then look for all
   * files in the input path, and process each of them by either:
   * - reading the file's contents and calculating its gzipped sie (when
   *   `gzipped` options is `true`)
   * - or, stating the file (if `gzipped` option is `false`).
   * Then, display size(s) on standard output.
   *
   * @return {Promise} A new Promise that is resolved once all input files have
   * been processed, and sizes have been displayed. Alternatively, it can be
   * rejected in case of errors.
   */
  build() {
    const [inputPath] = this.inputPaths;

    // Symlink/copy input -> output
    symlinkOrCopySync(inputPath, this.outputPath);

    // Process output directory
    return listFiles(inputPath, relativePath =>
      this.processFile(join(inputPath, relativePath))
        .then(sizes => this.print(relativePath, ...sizes))
    );
  }

  /**
   * Either reads the given file's contents and calculating its gzipped sie
   * (when `gzipped` options is `true`), or stats the given file
   * (if `gzipped` option is `false`).
   * @param {String} absolutePath Absolute path to the file
   * @return {Promise} A new Promise that is resolved when file has been
   * processed. The resolved value is an array containing the file size and the
   * gzipped file size (or undefined)
   */
  processFile(absolutePath) {
    // Stats the file if `gzipped` option is set to false
    if (!this.options.gzipped) {
      return pstat(absolutePath).then(stats => [stats.size]);
    }

    // Otherwise, reads the file contents and calculate gzipped size
    return preadFile(absolutePath)
      .then(contents => [contents, pgzip(contents)])
      .then(buffers => buffers.map(buffer => buffer.toString().length));
  }

  /**
   * Prints calculated sizes
   * @param {String} relativePath Relative path of the input file
   * @param {Number]} size Size of the input file in bytes
   * @param {Number} [gzippedSize] Size of the gzipped version of the file
   */
  print(relativePath, size, gzippedSize) {
    let message = `${yellow(relativePath)} => ${green(filesize(size))}`;
    if (!isUndefined(gzippedSize)) {
      message += grey(` (${filesize(gzippedSize)} gzipped)`);
    }
    if (!this.options.colors) {
      message = stripColor(message);
    }
    process.stdout.write(`${message}\n`);
  }
}
