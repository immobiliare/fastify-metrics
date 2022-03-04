'use strict';

const tap = require('tap');
const fastify = require('fastify');
const { Sampler } = require('@dnlup/doc');
const sinon = require('sinon');
const plugin = require('../');
const { STATSD_METHODS } = require('../lib/util');

async function setup(opts) {
    const app = fastify();
    app.register(plugin, opts);
    app.get(
        '/',
        {
            config: {
                metrics: {
                    routeId: 'noId',
                },
            },
        },
        async function () {
            return { ok: true };
        }
    );
    app.get(
        '/id',
        {
            config: {
                metrics: {
                    routeId: '123',
                },
            },
        },
        async function () {
            return { ok: true };
        }
    );
    app.get(
        '/oops',
        {
            config: {
                metrics: {
                    routeId: 'noId',
                },
            },
        },
        async function () {
            throw new Error('oops');
        }
    );
    await app.ready();
    return app;
}

tap.test('decorators', async (t) => {
    t.test('default metrcs decorator', async (t) => {
        const server = await setup({
            client: {
                host: 'udp://127.0.0.1:12000',
            },
        });
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
        const server = await setup({
            client: {
                host: 'udp://127.0.0.1:12000',
            },
            health: false,
        });
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
        const server = await setup({
            client: {
                host: 'udp://127.0.0.1:12000',
            },
        });

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
        const server = await setup({
            client: {
                host: `udp://127.0.0.1:7000`,
                namespace: 'ns',
            },
        });
        t.resolves(server.close());
    });
    t.test('fastify close with mocked client', async (t) => {
        const server = await setup();
        t.resolves(server.close());
    });
    t.test('dats onError', async (t) => {
        const server = await setup({
            client: {
                host: `udp://127.0.0.1:7000`,
                namespace: 'ns',
            },
        });
        t.teardown(() => server.close());
        const spy = sinon.spy(server.log, 'error');
        server.metrics.client.socket.onError(new Error('test'));
        t.equal('test', spy.getCall(0).firstArg.message);
    });
});
