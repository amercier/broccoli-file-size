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

export default class FileSizePlugin extends Plugin {

  constructor(inputNodes, options) {
    super(isArray(inputNodes) ? inputNodes : [inputNodes], options);

    this.options = merge({
      gzipped: true,
      colors: true,
    }, options);
  }

  build() {
    const [inputPath] = this.inputPaths;

    // Symlink/copy input -> output
    this.copy(inputPath, this.outputPath);

    // Process output directory
    return this.listFiles(inputPath, relativePath =>
      this.processFile(inputPath, relativePath)
        .then(sizes => this.print(relativePath, ...sizes))
    );
  }

  listFiles(dir, callback) {
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

  copy(inputPath, outputPath) {
    try {
      symlinkOrCopy.sync(inputPath, outputPath);
    } catch (e) {
      if (existsSync(outputPath)) {
        rimraf.sync(outputPath);
      }
      symlinkOrCopy.sync(inputPath, outputPath);
    }
  }

  processFile(dir, relativePath) {
    const absolutePath = join(dir, relativePath);
    if (this.options.gzipped) {
      return preadFile(absolutePath)
        .then(contents => this.processString(relativePath, contents));
    }
    return pstat(absolutePath)
      .then(stats => this.processStats(relativePath, stats));
  }

  processStats(relativePath, stats) {
    return resolve([stats.size]);
  }

  processString(relativePath, content) {
    return pgzip(content)
      .then(gzippedContent => [
        content.toString().length,
        gzippedContent.toString().length,
      ]);
  }

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
