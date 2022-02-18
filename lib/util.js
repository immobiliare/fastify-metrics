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
