import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'dist/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    // Los fixtures de Playwright exigen desestructurar con {} aunque no usen nada.
    files: ['pruebas/e2e/**/*.js', 'pruebas/rendimiento/**/*.js'],
    rules: { 'no-empty-pattern': 'off' },
  },
  {
    // FR-035: nada de datos financieros en la consola.
    files: ['src/**/*.{js,jsx}'],
    rules: { 'no-console': 'error' },
  },
];
