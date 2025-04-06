const tsConfigPaths = require('tsconfig-paths');
const tsConfig = require('./tsconfig.json');

const baseUrl = './src';
const cleanup = tsConfigPaths.register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths,
});
