'use strict';

module.exports = function sendTiming(name, value) {
    this.stats.timing(name, value);
};
