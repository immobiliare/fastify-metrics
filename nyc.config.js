'use strict';

const defaultExclude = require('@istanbuljs/schema/default-exclude');
const { gte16 } = require('./lib/utils');

module.exports = {
    exclude: defaultExclude.concat([
        gte16 ? 'lib/timerifyWrap.js' : 'lib/nativeTimerifyWrap.js',
    ]),
};
