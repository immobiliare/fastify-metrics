'use strict';

const { shouldSkip } = require('./util');
const { kMetricsLabel } = require('../symbols');

exports.decorators = {
    sendTimingMetric: function bindTimingMetric(client) {
        return function (name, value, sampling) {
            if (shouldSkip(this)) return;
            client.timing(`${this[kMetricsLabel]}.${name}`, value, sampling);
        };
    },

    sendCounterMetric: function bindCounterMetric(client) {
        return function (name, value, sampling) {
            if (shouldSkip(this)) return;
            client.counter(`${this[kMetricsLabel]}.${name}`, value, sampling);
        };
    },

    sendGaugeMetric: function bindGaugeMetric(client) {
        return function (name, value) {
            if (shouldSkip(this)) return;
            client.gauge(`${this[kMetricsLabel]}.${name}`, value);
        };
    },

    sendSetMetric: function bindSetMetric(client) {
        return function (name, value) {
            if (shouldSkip(this)) return;
            client.set(`${this[kMetricsLabel]}.${name}`, value);
        };
    },

    getMetricLabel: function bindGetRouteLabel() {
        return function () {
            return this[kMetricsLabel];
        };
    },
};

exports.getLabel = function (request) {
    const fastifyPrefix = request.routeOptions.config.metrics.fastifyPrefix
        ? `${request.routeOptions.config.metrics.fastifyPrefix}.`
        : request.routeOptions.config.metrics.fastifyPrefix;
    const routePrefix = request.routeOptions.config.metrics.routesPrefix
        ? `${request.routeOptions.config.metrics.routesPrefix}.`
        : request.routeOptions.config.metrics.routesPrefix;
    return `${fastifyPrefix}${routePrefix}${request.routeOptions.config.metrics.routeId}`;
};
