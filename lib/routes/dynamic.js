'use strict';

const { kMetricsLabel } = require('../symbols');

exports.decorators = {
    sendTimingMetric: function bindTimingMetric(client) {
        return function (name, value, sampling) {
            if (!this.context.config.metrics.routeId) return;
            client.timing(`${this[kMetricsLabel]}.${name}`, value, sampling);
        };
    },

    sendCounterMetric: function bindCounterMetric(client) {
        return function (name, value, sampling) {
            if (!this.context.config.metrics.routeId) return;
            client.counter(`${this[kMetricsLabel]}.${name}`, value, sampling);
        };
    },

    sendGaugeMetric: function bindGaugeMetric(client) {
        return function (name, value) {
            if (!this.context.config.metrics.routeId) return;
            client.gauge(`${this[kMetricsLabel]}.${name}`, value);
        };
    },

    sendSetMetric: function bindSetMetric(client) {
        return function (name, value) {
            if (!this.context.config.metrics.routeId) return;
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
    const fastifyPrefix = request.context.config.metrics.fastifyPrefix
        ? `${request.context.config.metrics.fastifyPrefix}.`
        : request.context.config.metrics.fastifyPrefix;
    const routePrefix = request.context.config.metrics.routesPrefix
        ? `${request.context.config.metrics.routesPrefix}.`
        : request.context.config.metrics.routesPrefix;
    return `${fastifyPrefix}${routePrefix}${request.context.config.metrics.routeId}`;
};
