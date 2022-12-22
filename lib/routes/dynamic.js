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
    const fastifyPrefix = request.routeConfig.metrics.fastifyPrefix
        ? `${request.routeConfig.metrics.fastifyPrefix}.`
        : request.routeConfig.metrics.fastifyPrefix;
    const routePrefix = request.routeConfig.metrics.routesPrefix
        ? `${request.routeConfig.metrics.routesPrefix}.`
        : request.routeConfig.metrics.routesPrefix;
    return `${fastifyPrefix}${routePrefix}${request.routeConfig.metrics.routeId}`;
};
