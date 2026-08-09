import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: ['dist/**', 'dist-prod/**', 'coverage/**', 'node_modules/**', '.tmp/**'],
    },

    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // The codebase leans on `any` at the chrome.* and bencode boundaries.
            // Those are tracked separately; keep the rule as a warning so new
            // occurrences are visible without failing the build on existing ones.
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
            'no-console': 'off',
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-var': 'error',
            'prefer-const': 'error',
        },
    },

    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            globals: { ...globals.browser, chrome: 'readonly' },
        },
    },

    {
        files: ['src/**/*.tsx'],
        plugins: { 'react-hooks': reactHooks },
        rules: reactHooks.configs.recommended.rules,
    },

    {
        files: ['test/**/*.{ts,tsx}'],
        languageOptions: {
            globals: { ...globals.node, ...globals.browser, chrome: 'writable' },
        },
        rules: {
            // Tests deliberately reach into mocks with loose types.
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },

    {
        files: ['e2e/**/*.ts'],
        languageOptions: {
            globals: { ...globals.node, ...globals.browser, chrome: 'readonly' },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            // Playwright's fixture signature is `async ({}, use) => {}`.
            'no-empty-pattern': 'off',
        },
    },

    {
        files: ['**/*.{js,cjs,mjs}'],
        extends: [tseslint.configs.disableTypeChecked],
        languageOptions: {
            globals: globals.node,
            sourceType: 'commonjs',
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },

    {
        files: ['eslint.config.js', 'scripts/**/*.mjs'],
        languageOptions: {
            globals: globals.node,
            sourceType: 'module',
        },
    },

    {
        files: ['*.config.ts'],
        languageOptions: {
            globals: globals.node,
        },
    },
);
