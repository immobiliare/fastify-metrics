'use strict';

const { kMetricsLabel } = require('../symbols');

exports.bindTimingMetric = function (client) {
    return function (name, value, sampling) {
        client.timing(`${this[kMetricsLabel]}.${name}`, value, sampling);
    };
};

exports.bindCounterMetric = function (client) {
    return function (name, value, sampling) {
        client.counter(`${this[kMetricsLabel]}.${name}`, value, sampling);
    };
};

exports.bindGaugeMetric = function (client) {
    return function (name, value) {
        client.gauge(`${this[kMetricsLabel]}.${name}`, value);
    };
};

exports.bindSetMetric = function (client) {
    return function (name, value) {
        client.set(`${this[kMetricsLabel]}.${name}`, value);
    };
};

exports.getRouteLabel = function () {
    return this[kMetricsLabel];
};

exports.getLabel = function (request) {
    const fastifyPrefix = request.context.config.metrics.fastifyPrefix
        ? `${request.context.config.metrics.fastifyPrefix}.`
        : request.context.config.metrics.fastifyPrefix;
    const routePrefix = request.context.config.metrics.routesPrefix
        ? `${request.context.config.metrics.routesPrefix}.`
        : request.context.config.metrics.routesPrefix;
    return `${fastifyPrefix}${routePrefix}${request.context.config.metrics.routeId}`;
};
