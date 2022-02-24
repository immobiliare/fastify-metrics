'use strict';

exports.getRouteId = function (config) {
    const { metrics } = config;
    return (metrics && metrics.routeId) || 'noId';
};

exports.normalizeFastifyPrefix = function (prefix) {
    if (prefix) {
        return prefix.replace(/\//g, '.').slice(1);
    }
    return prefix;
};

exports.normalizeRoutePrefix = function (prefix) {
    let routePrefix = prefix.trim();
    return routePrefix;
};

exports.STATSD_METHODS = [
    'counter',
    'timing',
    'gauge',
    'set',
    'close',
    'connect',
];

exports.isCustomClient = function (obj) {
    for (const key in obj) {
        if (typeof obj[key] === 'function') {
            return true;
        }
        return false;
    }
};
