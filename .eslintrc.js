'use strict';

module.exports = {
    env: {
        commonjs: true,
        es2021: true,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:prettier/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 12,
    },
    plugins: ['@typescript-eslint'],
    rules: {
        strict: 'error',
        'no-new': 'error',
        'no-process-exit': 'off',
    },
};
