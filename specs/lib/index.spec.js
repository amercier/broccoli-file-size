/* eslint-env mocha */

import fs from 'fs';
import { join } from 'path';

import assert from 'assert';
import { Builder } from 'broccoli';
import bufferEqual from 'buffer-equal';

import FileSizePlugin from '../../src/lib';
const fixtureDir = join(__dirname, '..', 'fixture');

let tree;
before(() => {
  tree = new FileSizePlugin(
    new FileSizePlugin([fixtureDir]),
    { gzipped: false, colors: false }
  );
  return new Builder(tree).build();
});

it('does not alter text files', () => {
  assert.equal(
    fs.readFileSync(join(tree.outputPath, 'lorem.txt'), 'utf8'),
    fs.readFileSync(join(fixtureDir, 'lorem.txt'), 'utf8')
  );
});

it('does not alter binary files', () => {
  assert.ok(
    bufferEqual(
      fs.readFileSync(join(tree.outputPath, 'broccoli-logo.generated.png')),
      fs.readFileSync(join(fixtureDir, 'broccoli-logo.generated.png'))
    )
  );
});

it('does not alter paths', () => {
  assert.equal(
    fs.readFileSync(join(tree.outputPath, 'subdir', 'other.txt'), 'utf8'),
    fs.readFileSync(join(fixtureDir, 'subdir', 'other.txt'), 'utf8')
  );
});
