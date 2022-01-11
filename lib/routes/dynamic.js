'use strict';

const {
    getRouteId,
    normalizeFastifyPrefix,
    normalizeRoutePrefix,
} = require('../util');

exports.bindTimingMetric = function (client) {
    return function (name, value, sampling) {
        client.timing(`${this.metricsLabel}.${name}`, value, sampling);
    };
};

exports.bindCounterMetric = function (client) {
    return function (name, value, sampling) {
        client.counter(`${this.metricsLabel}.${name}`, value, sampling);
    };
};

exports.bindGaugeMetric = function (client) {
    return function (name, value) {
        client.gauge(`${this.metricsLabel}.${name}`, value);
    };
};

exports.bindSetMetric = function (client) {
    return function (name, value) {
        client.set(`${this.metricsLabel}.${name}`, value);
    };
};

exports.getLabel = function (request) {
    const id = getRouteId(request.context.config);
    const fastifyPrefix = normalizeFastifyPrefix(this.prefix);
    const routePrefix = normalizeRoutePrefix(this.metricsRoutesPrefix);
    return `${fastifyPrefix}${routePrefix}${id}`;
};
