'use strict';

const defaultExclude = require('@istanbuljs/schema/default-exclude');
const { gte16 } = require('./lib/utils');

const onLt16 = ['lib/timerifyWrap.js', 'lib/sendPerfEntry.js'];

module.exports = {
    exclude: defaultExclude.concat(gte16 ? [] : onLt16),
};
