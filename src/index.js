import { existsSync, readFile, stat } from 'fs';
import { join, relative } from 'path';
import { gzip } from 'zlib';

import { green, grey, stripColor, yellow } from 'chalk';
import filesize from 'filesize';
import { isArray, isUndefined } from 'lodash';
import merge from 'merge';
import Plugin from 'broccoli-plugin';
import promisify from 'promisify-node';
import rimraf from 'rimraf';
import symlinkOrCopy from 'symlink-or-copy';
import walk from 'walk';
import { Promise } from 'rsvp';

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
    return new Promise((resolve, reject) => {
      walk.walk(inputPath, { followLinks: true })
      .on('file', (root, stats, next) => {
        const destDir = relative(inputPath, root);
        this.processFile(
          inputPath,
          destDir ? join(destDir, stats.name) : stats.name
        ).then(next);
      })
      .on('errors', reject)
      .on('end', resolve);
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
      return preadFile(absolutePath).then(
        contents => this.processString(relativePath, contents)
      );
    }
    return pstat(absolutePath).then(
      stats => this.processStats(relativePath, stats)
    );
  }

  processStats(relativePath, stats) {
    this.print(relativePath, stats.size);
  }

  processString(relativePath, content) {
    if (this.options.gzipped) {
      return pgzip(content).then(
        gzippedContent => this.print(
          relativePath,
          content.toString().length,
          gzippedContent.toString().length
        )
      );
    }
    this.print(relativePath, filesize(content));
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
