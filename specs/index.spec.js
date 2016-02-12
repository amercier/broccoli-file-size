/* eslint-env mocha */

import assert from 'assert';
import bufferEqual from 'buffer-equal';
import fs from 'fs';
import { sync } from 'rimraf';

after(() => {
  sync('specs/fixture/output');
});

it('does not alter text files', () => {
  assert.equal(
    fs.readFileSync('specs/fixture/output/lorem.txt', 'utf8'),
    fs.readFileSync('specs/fixture/files/lorem.txt', 'utf8')
  );
});

it('does not alter binary files', () => {
  assert.ok(
    bufferEqual(
      fs.readFileSync('specs/fixture/output/broccoli-logo.generated.png'),
      fs.readFileSync('specs/fixture/files/broccoli-logo.generated.png')
    )
  );
});

it('does not alter paths', () => {
  assert.equal(
    fs.readFileSync('specs/fixture/output/subdir/other.txt', 'utf8'),
    fs.readFileSync('specs/fixture/files/subdir/other.txt', 'utf8')
  );
});
