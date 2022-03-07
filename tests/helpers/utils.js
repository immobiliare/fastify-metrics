'use strict';
const plugin = require('../../');
const fastify = require('fastify');
const { default: DatsMock } = require('@immobiliarelabs/dats/dist/mock');

async function setupRoutes(opts, routes, mockClient = true) {
    const pluginOpts = {
        ...opts,
        client: mockClient
            ? new DatsMock({
                  ...(opts.client || {}),
                  host: `udp://127.0.0.1:5454`,
              })
            : opts.client || {},
        routes: {
            ...(opts.routes || {}),
        },
    };
    const app = fastify();
    app.register(plugin, pluginOpts);

    addRoutes(app, routes);
    await app.ready();

    return app;
}

function addRoutes(app, routes) {
    for (const route of routes) {
        if (route.routes && route.options) {
            app.register(async function (fastify) {
                addRoutes(fastify, route.routes);
            }, route.options);
        } else {
            app.route(route);
        }
    }
}

async function defaultSetup(opts = {}, cb, t, prefix = '/static/test') {
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

    const plainRoutes = [
        {
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
        },
        {
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
        },
        {
            url: '/id',
            method: ['GET', 'POST'],
            config: { metrics: { routeId: 'myId-1' } },
            handler: async function () {
                return { ok: true };
            },
        },
        {
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
        },
        {
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
        },
        {
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
        },
    ];

    const routes = [
        ...plainRoutes,
        {
            options: { prefix },
            routes: plainRoutes.map((obj) => {
                if (
                    obj.config &&
                    obj.config.metrics &&
                    obj.config.metrics.routeId
                ) {
                    return {
                        ...obj,
                        config: {
                            metrics: {
                                routeId: obj.config.metrics.routeId.replace(
                                    '-1',
                                    '-2'
                                ),
                            },
                        },
                    };
                }
                return { ...obj };
            }),
        },
    ];

    const app = await setupRoutes({ ...opts, health: false }, routes);
    return app;
}

module.exports = {
    defaultSetup,
    setupRoutes,
};
