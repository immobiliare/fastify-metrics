'use strict';
const plugin = require('../../');
const fastify = require('fastify');

exports.setup = async function setup(
    opts = {},
    cb,
    t,
    prefix = '/static/test'
) {
    if (!cb) {
        cb = (req, res) => {
            const fastifyPrefix = req.context.config.metrics.fastifyPrefix
                ? `${req.context.config.metrics.fastifyPrefix}.`
                : req.context.config.metrics.fastifyPrefix;
            const routePrefix = req.context.config.metrics.routesPrefix
                ? `${req.context.config.metrics.routesPrefix}.`
                : req.context.config.metrics.routesPrefix;
            t.equal(req.getMetricLabel(), res.getMetricLabel());
            t.equal(
                req.getMetricLabel(),
                `${fastifyPrefix}${routePrefix}${req.context.config.metrics.routeId}`
            );
        };
    }

    const client = opts.client || {};
    const routes = opts.routes || {};
    const pluginOpts = {
        client: {
            ...client,
            host: `udp://127.0.0.1:${t.context.address.port}`,
        },
        routes: {
            ...routes,
        },
        health: false,
    };
    const app = fastify();
    app.register(plugin, pluginOpts);

    app.route({
        url: '/no-metrics',
        method: ['GET', 'POST'],
        handler: async function (request, reply) {
            reply.sendTimingMetric('time', 1);
            reply.sendCounterMetric('count', 1);
            reply.sendGaugeMetric('gauge', 1);
            reply.sendSetMetric('set', 1);
            request.sendTimingMetric('time', 1);
            request.sendCounterMetric('count', 1);
            request.sendGaugeMetric('gauge', 1);
            request.sendSetMetric('set', 1);
            return { ok: true };
        },
    });

    app.route({
        url: '/',
        method: ['GET', 'POST'],
        config: {
            metrics: {
                routeId: 'noId',
            },
        },
        handler: async function () {
            return { ok: true };
        },
    });
    app.route({
        url: '/id',
        method: ['GET', 'POST'],
        config: { metrics: { routeId: 'myId-1' } },
        handler: async function () {
            return { ok: true };
        },
    });
    app.route({
        url: '/reply-decorators',
        method: ['GET', 'POST'],
        config: {
            metrics: {
                routeId: 'noId',
            },
        },
        handler: async function (request, reply) {
            reply.sendTimingMetric('time', 1);
            reply.sendCounterMetric('count', 1);
            reply.sendGaugeMetric('gauge', 1);
            reply.sendSetMetric('set', 1);
            cb(request, reply);
            return { ok: true };
        },
    });
    app.route({
        url: '/reply-decorators/id',
        method: ['GET', 'POST'],
        config: { metrics: { routeId: 'replyId-1' } },
        handler: async function (request, reply) {
            reply.sendTimingMetric('time', 1);
            reply.sendCounterMetric('count', 1);
            reply.sendGaugeMetric('gauge', 1);
            reply.sendSetMetric('set', 1);
            cb(request, reply);
            return { ok: true };
        },
    });
    app.route({
        url: '/oops',
        method: ['GET', 'POST'],
        config: {
            metrics: {
                routeId: 'noId',
            },
        },
        handler: async function () {
            throw new Error('oops');
        },
    });

    app.register(
        async function (f) {
            f.route({
                url: '/',
                method: ['GET', 'POST'],
                config: {
                    metrics: {
                        routeId: 'noId',
                    },
                },
                handler: async function () {
                    return { ok: true };
                },
            });
            f.route({
                url: '/id',
                method: ['GET', 'POST'],
                config: { metrics: { routeId: 'myId-2' } },
                handler: async function () {
                    return { ok: true };
                },
            });
            f.route({
                url: '/reply-decorators',
                method: ['GET', 'POST'],
                config: {
                    metrics: {
                        routeId: 'noId',
                    },
                },
                handler: async function (request, reply) {
                    reply.sendTimingMetric('time', 1);
                    reply.sendCounterMetric('count', 1);
                    reply.sendGaugeMetric('gauge', 1);
                    reply.sendSetMetric('set', 1);
                    cb(request, reply);
                    return { ok: true };
                },
            });
            f.route({
                url: '/reply-decorators/id',
                method: ['GET', 'POST'],
                config: { metrics: { routeId: 'replyId-2' } },
                handler: async function (request, reply) {
                    reply.sendTimingMetric('time', 1);
                    reply.sendCounterMetric('count', 1);
                    reply.sendGaugeMetric('gauge', 1);
                    reply.sendSetMetric('set', 1);
                    cb(request, reply);
                    return { ok: true };
                },
            });
            f.route({
                url: '/oops',
                method: ['GET', 'POST'],
                config: {
                    metrics: {
                        routeId: 'noId',
                    },
                },
                handler: async function () {
                    throw new Error('oops');
                },
            });
        },
        { prefix }
    );
    await app.ready();
    return app;
};
