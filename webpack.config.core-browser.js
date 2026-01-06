const path = require('path');

module.exports = {
  context: __dirname,
  entry: path.resolve(__dirname, 'frontend/src/core-engine/BrowserEntry.js'),
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'src/js'),
    filename: 'core-runner-bundle.js',
    library: { type: 'var', name: 'CoreRunnerBundle' }
  },
  mode: 'production'
};
