'use strict';

const tap = require('tap');
const { Sampler } = require('@dnlup/doc');
const sinon = require('sinon');
const { STATSD_METHODS } = require('../lib/util');
const { setupRoutes } = require('./helpers/utils');

const routes = [
    {
        url: '/',
        method: ['GET'],
        config: { metrics: { routeId: 'noId' } },
        handler: async function () {
            return { ok: true };
        },
    },
    {
        url: '/id',
        method: ['GET'],
        config: { metrics: { routeId: '123' } },
        handler: async function () {
            return { ok: true };
        },
    },
    {
        url: '/oops',
        method: ['GET'],
        config: { metrics: { routeId: 'noId' } },
        handler: async function () {
            throw new Error('oops');
        },
    },
];

tap.test('decorators', async (t) => {
    t.test('default metrcs decorator', async (t) => {
        const server = await setupRoutes(
            {
                client: {
                    host: 'udp://127.0.0.1:12000',
                },
            },
            routes,
            false
        );
        t.ok(server.hasDecorator('metrics'));
        t.ok(server.metrics.sampler instanceof Sampler);
        t.equal('string', typeof server.metrics.namespace);
        t.equal('string', typeof server.metrics.fastifyPrefix);
        t.equal('string', typeof server.metrics.routesPrefix);
        t.equal('function', typeof server.metrics.hrtime2us);
        t.equal('function', typeof server.metrics.hrtime2ns);
        t.equal('function', typeof server.metrics.hrtime2ms);
        t.equal('function', typeof server.metrics.hrtime2s);
        for (const method of STATSD_METHODS) {
            t.equal('function', typeof server.metrics.client[method]);
        }
    });

    t.test('without sampler', async (t) => {
        const server = await setupRoutes(
            {
                client: {
                    host: 'udp://127.0.0.1:12000',
                },
                health: false,
            },
            routes,
            false
        );
        t.ok(server.hasDecorator('metrics'));
        t.notOk(server.metrics.sampler instanceof Sampler);
        t.equal('string', typeof server.metrics.namespace);
        t.equal('string', typeof server.metrics.fastifyPrefix);
        t.equal('string', typeof server.metrics.routesPrefix);
        t.equal('function', typeof server.metrics.hrtime2us);
        t.equal('function', typeof server.metrics.hrtime2ns);
        t.equal('function', typeof server.metrics.hrtime2ms);
        t.equal('function', typeof server.metrics.hrtime2s);
        for (const method of STATSD_METHODS) {
            t.equal('function', typeof server.metrics.client[method]);
        }
    });

    t.test('request and reply decorators', async (t) => {
        const server = await setupRoutes(
            {
                client: {
                    host: 'udp://127.0.0.1:12000',
                },
            },
            routes,
            false
        );

        t.ok(server.hasRequestDecorator('sendTimingMetric'));
        t.ok(server.hasRequestDecorator('sendCounterMetric'));
        t.ok(server.hasRequestDecorator('sendGaugeMetric'));
        t.ok(server.hasRequestDecorator('sendSetMetric'));
        t.ok(server.hasRequestDecorator('sendTimingMetric'));
        t.ok(server.hasRequestDecorator('sendCounterMetric'));
        t.ok(server.hasRequestDecorator('sendGaugeMetric'));
        t.ok(server.hasRequestDecorator('sendSetMetric'));
        t.ok(server.hasRequestDecorator('getMetricLabel'));

        t.ok(server.hasReplyDecorator('sendTimingMetric'));
        t.ok(server.hasReplyDecorator('sendCounterMetric'));
        t.ok(server.hasReplyDecorator('sendGaugeMetric'));
        t.ok(server.hasReplyDecorator('sendSetMetric'));
        t.ok(server.hasReplyDecorator('sendTimingMetric'));
        t.ok(server.hasReplyDecorator('sendCounterMetric'));
        t.ok(server.hasReplyDecorator('sendGaugeMetric'));
        t.ok(server.hasReplyDecorator('sendSetMetric'));
        t.ok(server.hasRequestDecorator('getMetricLabel'));
    });
});

tap.test('hooks', async (t) => {
    t.test('fastify close', async (t) => {
        const server = await setupRoutes(
            {
                client: {
                    host: `udp://127.0.0.1:7000`,
                    namespace: 'ns',
                },
            },
            routes,
            false
        );
        t.resolves(server.close());
    });
    t.test('fastify close with mocked client', async (t) => {
        const server = await setupRoutes({}, routes, false);
        t.resolves(server.close());
    });
    t.test('dats onError', async (t) => {
        const server = await setupRoutes(
            {
                client: {
                    host: `udp://127.0.0.1:7000`,
                    namespace: 'ns',
                },
            },
            routes,
            false
        );
        t.teardown(() => server.close());
        const spy = sinon.spy(server.log, 'error');
        server.metrics.client.socket.onError(new Error('test'));
        t.equal('test', spy.getCall(0).firstArg.message);
    });
});
