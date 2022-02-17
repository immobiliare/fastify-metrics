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
    // let normalized = prefix.replace(/\//g, '.');
    // if (normalized) {
    //     // remove `.` at the beginning and add trailing `.`
    //     normalized = `${normalized.slice(1)}.`;
    // }
    // return normalized;
};

exports.normalizeRoutePrefix = function (prefix) {
    // let routePrefix = prefix;
    // if (routePrefix) {
    //     // add trailing `.`
    //     routePrefix = `${routePrefix}.`;
    // }
    let routePrefix = prefix.trim();
    return routePrefix;
};
