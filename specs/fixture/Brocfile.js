import FileSizePlugin from '../../src';

export default new FileSizePlugin(
  new FileSizePlugin('files'),
  { gzipped: false, colors: false }
);
