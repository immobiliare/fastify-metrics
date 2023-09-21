'use strict';

const { shouldSkip } = require('./util');
const { kMetricsLabel } = require('../symbols');

exports.decorators = {
    sendTimingMetric: function bindTimingMetric(client) {
        return function (name, value, sampling) {
            if (shouldSkip(this)) return;
            client.timing(`${this.getMetricLabel()}.${name}`, value, sampling);
        };
    },

    sendCounterMetric: function bindCounterMetric(client) {
        return function (name, value, sampling) {
            if (shouldSkip(this)) return;
            client.counter(`${this.getMetricLabel()}.${name}`, value, sampling);
        };
    },

    sendGaugeMetric: function bindGaugeMetric(client) {
        return function (name, value) {
            if (shouldSkip(this)) return;
            client.gauge(`${this.getMetricLabel()}.${name}`, value);
        };
    },

    sendSetMetric: function bindSetMetric(client) {
        return function (name, value) {
            if (shouldSkip(this)) return;
            client.set(`${this.getMetricLabel()}.${name}`, value);
        };
    },

    getMetricLabel: function bindGetRouteLabel(type) {
        if (type === 'reply') {
            return function () {
                return this.request.routeOptions.config.metrics[kMetricsLabel];
            };
        }
        return function () {
            return this.routeOptions.config.metrics[kMetricsLabel];
        };
    },
};

exports.getLabel = function (options) {
    const { routeId, fastifyPrefix, routesPrefix } = options.config.metrics;
    return `${fastifyPrefix ? `${fastifyPrefix}.` : ''}${routesPrefix ? `${routesPrefix}.` : ''}${routeId}`;
};
