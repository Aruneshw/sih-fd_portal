// ESLint flat config (ESLint 9). Layer boundaries from architecture.md §3 are
// enforced with no-restricted-imports per folder.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const layer = (patterns, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }],
});

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'e2e'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // NFR-08: never render raw HTML.
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'dangerouslySetInnerHTML is forbidden (NFR-08).' },
      ],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    ignores: ['src/domain/**/*.test.ts'],
    rules: layer(['react', 'react-*', '@/data/*', '@/services/*', '@/features/*', '@/components/*', '@/app/*', 'idb-keyval'], 'domain/ is pure: only lib/, zod and date-fns.'),
  },
  {
    files: ['src/lib/**/*.ts'],
    ignores: ['src/lib/**/*.test.ts'],
    rules: layer(['react', '@/domain/*', '@/data/*', '@/services/*', '@/features/*', '@/components/*', '@/app/*'], 'lib/ depends on nothing in the app.'),
  },
  {
    files: ['src/data/**/*.ts'],
    ignores: ['src/data/**/*.test.ts'],
    rules: layer(['react', '@/services/*', '@/features/*', '@/components/*', '@/app/*'], 'data/ imports only domain/ and lib/.'),
  },
  {
    files: ['src/services/**/*.ts'],
    ignores: ['src/services/**/*.test.ts'],
    rules: layer(['@/features/*', '@/components/*', '@/app/*'], 'services/ imports domain/, data/, lib/.'),
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: layer(['@/features/*', '@/app/*'], 'components/ui must not import features.'),
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: layer(['@/features/*/pages/*', '@/features/*/components/*', '@/features/*/hooks/*', '@/data/storage/*'], 'Import other features only via their index.ts; never touch storage.'),
  },
);
