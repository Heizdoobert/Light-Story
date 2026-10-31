// Rollup configuration for the Dynamic SDK (CommonJS)
const path = require('node:path');
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const { terser } = require('rollup-plugin-terser');

module.exports = {
  input: path.resolve(__dirname, 'src/loader.ts'),
  external: [/^\.\.\/\.\.\/ui\/src\/components/],
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
    entryFileNames: '[name].js',
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
    terser(),
  ],
};