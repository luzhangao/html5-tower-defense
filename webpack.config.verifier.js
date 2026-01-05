const path = require('path');

module.exports = {
  context: __dirname,
  entry: path.resolve(__dirname, 'frontend/src/core/Engine.js'),
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'backend/verifier'),
    filename: 'engine-bundle.js',
    library: { type: 'commonjs2' }
  },
  mode: 'production'
};
