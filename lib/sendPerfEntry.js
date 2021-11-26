'use strict';

module.exports = function sendPerfEntry(name, entry) {
    this.stats.timing(name, entry.duration);
};
