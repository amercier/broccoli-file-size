/* eslint-env mocha */

'use strict';
var assert = require('assert');
var bufferEqual = require('buffer-equal');
var fs = require('fs');
var rimraf = require('rimraf');

after(function cleanup() {
  rimraf.sync('temp');
});

it('does not alter text files', function spec() {
  assert.equal(
    fs.readFileSync('temp/lorem.txt', 'utf8'),
    fs.readFileSync('fixture/lorem.txt', 'utf8')
  );
});

it('does not alter binary files', function spec() {
  assert.ok(
    bufferEqual(
      fs.readFileSync('temp/broccoli-logo.generated.png'),
      fs.readFileSync('fixture/broccoli-logo.generated.png')
    )
  );
});

it('does not alter paths', function spec() {
  assert.equal(
    fs.readFileSync('temp/subdir/other.txt', 'utf8'),
    fs.readFileSync('fixture/subdir/other.txt', 'utf8')
  );
});
