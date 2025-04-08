const tsConfigPaths = require('tsconfig-paths');
const tsConfig = require('./tsconfig.json');

// Определяем базовый URL в зависимости от среды
const baseUrl = process.env.NODE_ENV === 'production' ? './dist' : './src';
const cleanup = tsConfigPaths.register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths,
});
