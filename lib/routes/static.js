'use strict';

const { kMetricsLabel } = require('../symbols');

exports.decorators = {
    sendTimingMetric: function bindTimingMetric(client) {
        return function (name, value, sampling) {
            if (!this.context.config.metrics.routeId) return;
            client.timing(
                `${this.context.config.metrics[kMetricsLabel]}.${name}`,
                value,
                sampling
            );
        };
    },

    sendCounterMetric: function bindCounterMetric(client) {
        return function (name, value, sampling) {
            if (!this.context.config.metrics.routeId) return;
            client.counter(
                `${this.context.config.metrics[kMetricsLabel]}.${name}`,
                value,
                sampling
            );
        };
    },

    sendGaugeMetric: function bindGaugeMetric(client) {
        return function (name, value) {
            if (!this.context.config.metrics.routeId) return;
            client.gauge(
                `${this.context.config.metrics[kMetricsLabel]}.${name}`,
                value
            );
        };
    },

    sendSetMetric: function bindSetMetric(client) {
        return function (name, value) {
            if (!this.context.config.metrics.routeId) return;
            client.set(
                `${this.context.config.metrics[kMetricsLabel]}.${name}`,
                value
            );
        };
    },

    getMetricLabel: function bindGetRouteLabel() {
        return function () {
            return this.context.config.metrics[kMetricsLabel];
        };
    },
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
