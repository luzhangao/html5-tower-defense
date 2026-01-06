const path = require('path');

module.exports = {
  context: __dirname,
  entry: path.resolve(__dirname, 'frontend/src/core-engine/VerifyCore.js'),
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'backend/verifier'),
    filename: 'core-engine-bundle.js',
    library: { type: 'commonjs2' }
  },
  mode: 'production'
};
