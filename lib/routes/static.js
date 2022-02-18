'use strict';

const { kMetricsLabel } = require('../symbols');

exports.bindTimingMetric = function (client) {
    return function sendTimingMetric(name, value, sampling) {
        client.timing(
            `${this.context.config.metrics[kMetricsLabel]}.${name}`,
            value,
            sampling
        );
    };
};
exports.bindCounterMetric = function (client) {
    return function sendCounterMetric(name, value, sampling) {
        client.counter(
            `${this.context.config.metrics[kMetricsLabel]}.${name}`,
            value,
            sampling
        );
    };
};

exports.bindGaugeMetric = function (client) {
    return function sendGaugeMetric(name, value) {
        client.gauge(
            `${this.context.config.metrics[kMetricsLabel]}.${name}`,
            value
        );
    };
};

exports.bindSetMetric = function (client) {
    return function sendSetMetric(name, value) {
        client.set(
            `${this.context.config.metrics[kMetricsLabel]}.${name}`,
            value
        );
    };
};

exports.getLabel = function (options) {
    const fastifyPrefix = options.config.metrics.fastifyPrefix
        ? `${options.config.metrics.fastifyPrefix}.`
        : options.config.metrics.fastifyPrefix;
    const routePrefix = options.config.metrics.routesPrefix
        ? `${options.config.metrics.routesPrefix}.`
        : options.config.metrics.routesPrefix;
    return `${fastifyPrefix}${routePrefix}${options.config.metrics.routeId}`;
};
