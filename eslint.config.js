import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.tools/**', 'supabase/functions/**', 'playwright-report/**', 'test-results/**', 'liquid-glass-studio-main/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx}'], plugins: { 'react-hooks': reactHooks }, rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], 'react-hooks/rules-of-hooks': 'error' } },
  { files: ['**/*.{ts,tsx,js,mjs}'], languageOptions: { globals: { window: 'readonly', document: 'readonly', console: 'readonly', process: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', fetch: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly', navigator: 'readonly', crypto: 'readonly', Blob: 'readonly', File: 'readonly', AbortController: 'readonly', Intl: 'readonly', TextEncoder: 'readonly', Buffer: 'readonly', Request: 'readonly', Response: 'readonly', performance: 'readonly', location: 'readonly' } } },
);
