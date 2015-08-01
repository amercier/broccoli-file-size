'use strict';
var assert = require('assert');
var fs = require('fs');
var rimraf = require('rimraf');

afterEach(function () {
  rimraf.sync('temp');
});

it('should not alterate content', function () {
  assert.equal(
    fs.readFileSync('temp/lorem.txt', 'utf8'),
    fs.readFileSync('fixture/lorem.txt', 'utf8')
  );
});
