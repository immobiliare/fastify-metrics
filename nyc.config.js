'use strict';

const defaultExclude = require('@istanbuljs/schema/default-exclude');
const { gte16 } = require('./lib/utils');

const onGte16 = ['lib/timerifyWrap.js', 'lib/sendTiming.js'];
const onLt16 = ['lib/nativeTimerifyWrap.js', 'lib/sendPerfEntry.js'];

module.exports = {
    exclude: defaultExclude.concat(gte16 ? onGte16 : onLt16),
};
