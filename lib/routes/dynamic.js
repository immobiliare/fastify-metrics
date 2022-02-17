'use strict';

const { getRouteId } = require('../util');

exports.bindTimingMetric = function (client) {
    return function (name, value, sampling) {
        client.timing(`${this._metricsLabel}.${name}`, value, sampling);
    };
};

exports.bindCounterMetric = function (client) {
    return function (name, value, sampling) {
        client.counter(`${this._metricsLabel}.${name}`, value, sampling);
    };
};

exports.bindGaugeMetric = function (client) {
    return function (name, value) {
        client.gauge(`${this._metricsLabel}.${name}`, value);
    };
};

exports.bindSetMetric = function (client) {
    return function (name, value) {
        client.set(`${this._metricsLabel}.${name}`, value);
    };
};

exports.getLabel = function (request) {
    const id = getRouteId(request.context.config);
    const fastifyPrefix = request.context.config.metrics.fastifyPrefix
        ? `${request.context.config.metrics.fastifyPrefix}.`
        : request.context.config.metrics.fastifyPrefix;
    const routePrefix = request.context.config.metrics.routesPrefix
        ? `${request.context.config.metrics.routesPrefix}.`
        : request.context.config.metrics.routesPrefix;
    return `${fastifyPrefix}${routePrefix}${id}`;
};
