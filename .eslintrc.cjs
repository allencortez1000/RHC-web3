module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', '@next/next'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2022: true, jest: true, browser: true },
  settings: { react: { version: 'detect' } },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['apps/customer-web/**/*.{js,jsx,ts,tsx}', 'apps/admin-web/**/*.{js,jsx,ts,tsx}'],
      extends: ['next/core-web-vitals', 'next/typescript'],
      settings: {
        next: { rootDir: [`${__dirname}/apps/customer-web/`, `${__dirname}/apps/admin-web/`] },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['**/*.js', '**/*.cjs'],
      rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
  ],
  ignorePatterns: [
    'dist',
    '.next',
    'coverage',
    'node_modules',
    'next-env.d.ts',
    'playwright-report',
    'test-results',
  ],
};
