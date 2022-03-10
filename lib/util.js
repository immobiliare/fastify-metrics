'use strict';

const { default: Dats } = require('@immobiliarelabs/dats');

exports.getRouteId = function (config) {
    const { metrics } = config;
    return (metrics && metrics.routeId) || '';
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
    if (obj instanceof Dats) return true;
    for (const key of exports.STATSD_METHODS) {
        if (typeof obj[key] === 'function') {
            return true;
        }
    }
    return false;
};
