'use strict';

const {
    getRouteId,
    normalizeRoutePrefix,
    normalizeFastifyPrefix,
} = require('../util');

exports.bindTimingMetric = function (client) {
    return function sendTimingMetric(name, value, sampling) {
        client.timing(
            `${this.context.config.metrics.label}.${name}`,
            value,
            sampling
        );
    };
};
exports.bindCounterMetric = function (client) {
    return function sendCounterMetric(name, value, sampling) {
        client.counter(
            `${this.context.config.metrics.label}.${name}`,
            value,
            sampling
        );
    };
};

exports.bindGaugeMetric = function (client) {
    return function sendGaugeMetric(name, value) {
        client.gauge(`${this.context.config.metrics.label}.${name}`, value);
    };
};

exports.bindSetMetric = function (client) {
    return function sendSetMetric(name, value) {
        client.set(`${this.context.config.metrics.label}.${name}`, value);
    };
};

exports.getLabel = function (prefix, options) {
    const id = getRouteId(options.config);
    const fastifyPrefix = normalizeFastifyPrefix(options.prefix);
    const routePrefix = normalizeRoutePrefix(prefix);
    return `${fastifyPrefix}${routePrefix}${id}`;
};
