'use strict';

module.exports = {
    env: {
        commonjs: true,
        es2021: true,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:prettier/recommended'],
    parserOptions: {
        ecmaVersion: 13,
    },
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            parser: '@typescript-eslint/parser',
            plugins: ['@typescript-eslint'],
            rules: {
                // Prevent TypeScript-specific constructs from being erroneously flagged as unused
                '@typescript-eslint/no-unused-vars': 'error',
            },
        },
    ],
    rules: {
        strict: 'error',
    },
};
