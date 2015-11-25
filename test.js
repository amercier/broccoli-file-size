'use strict';
var assert = require('assert');
var fs = require('fs');
var rimraf = require('rimraf');

after(function () {
  rimraf.sync('temp');
});

it('does not alterate content', function () {
  assert.equal(
    fs.readFileSync('temp/lorem.txt', 'utf8'),
    fs.readFileSync('fixture/lorem.txt', 'utf8')
  );
});

it('symlinks files, not copy them', function () {
  assert.equal(
    fs.realpathSync('temp/lorem.txt'),
    fs.realpathSync('fixture/lorem.txt')
  );
});
