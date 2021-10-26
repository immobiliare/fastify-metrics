'use strict';

module.exports = {
    '*.{js,css,json,md,yml,yaml}': ['prettier --write'],
    '*.md': (filenames) => {
        const list = filenames.map(
            (filename) => `'markdown-toc -i ${filename}`
        );
        return list;
    },
    '*.{js,ts,tsx}': ['eslint --fix'],
};
