module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  env: { node: true, es2022: true },
  ignorePatterns: ['dist/', 'node_modules/', '*.d.ts', '**/*.d.ts'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
  },
};
