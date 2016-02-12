broccoli-file-size
==================

[![Latest Stable Version](https://img.shields.io/npm/v/broccoli-file-size.svg)](https://www.npmjs.com/package/broccoli-file-size)
[![NPM Downloads](https://img.shields.io/npm/dm/broccoli-file-size.svg)](https://www.npmjs.com/package/broccoli-file-size)
[![Build Status](https://img.shields.io/travis/amercier/broccoli-file-size/master.svg)](https://travis-ci.org/amercier/broccoli-file-size)
[![Dependency Status](http://img.shields.io/gemnasium/amercier/broccoli-file-size.svg)](https://gemnasium.com/amercier/broccoli-file-size)


Broccoli plugin to display file sizes. Example output:

    > broccoli build dist

    file1.txt => 446 kB (284 kB gzipped)
    file2.txt => 223 kB (74 kB gzipped)
    file3.txt => 543 kB (324 B gzipped)

Installation
============

    npm install --save-dev broccoli-file-size

Usage
=====

### ES5

    var FileSizePlugin = require('broccoli-file-size').default;
    tree = new FileSizePlugin(tree);

### ES2015+

    import FileSizePlugin from 'broccoli-file-size';
    tree = new FileSizePlugin(tree);

Options
=======

    tree = new FileSizePlugin(tree, {
      colors: true,
      gzipped: true
    });

### colors

Enable/disable colors (default: `true`).

### gzipped

Show/hide gzipped size (default: `true`).
