'use strict';

const tap = require('tap');
const fastify = require('fastify');
const { Sampler } = require('@dnlup/doc');
const { default: Dats } = require('@immobiliarelabs/dats');
const sinon = require('sinon');
const { StatsdMock } = require('./helpers/statsd');
const StatsdMockTCP = require('./helpers/statsdTCP');
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

tap.test('configuration validation', async (t) => {
    t.test('valid options', async (t) => {
        const configs = [
            {
                value: undefined,
            },
            {
                value: {
                    client: {
                        host: 'udp://172.0.0.100:123',
                        namespace: 'ns',
                    },
                },
            },
            {
                value: {
                    health: {
                        sampleInterval: 2000,
                    },
                },
            },
        ];
        for (const config of configs) {
            t.resolves(setup(config));
        }
    });

    t.test('invalid options', async (t) => {
        const configs = [
            {
                value: {
                    routes: {
                        timing: 'true',
                    },
                },
                message: '"timing" must be a boolean.',
            },
            {
                value: {
                    routes: {
                        hits: 1,
                    },
                },
                message: '"hits" must be a boolean.',
            },
            {
                value: {
                    routes: {
                        errors: {},
                    },
                },
                message: '"errors" must be a boolean.',
            },
            {
                value: {
                    health: [],
                },
                message: '"health" must be a boolean or an object.',
            },
            {
                value: {
                    routes: {
                        prefix: null,
                    },
                },
                message: '"prefix" must be a string.',
            },
            {
                value: {
                    routes: {
                        mode: 'some',
                    },
                },
                message:
                    '"mode" must be one of these values: "static", "dynamic".',
            },
            {
                value: {
                    routes: {
                        mode: null,
                    },
                },
                message:
                    '"mode" must be one of these values: "static", "dynamic".',
            },
            {
                value: {
                    routes: {
                        getLabel: 123,
                    },
                },
                message: '"getLabel" must be a function.',
            },
            {
                value: {
                    routes: {
                        mode: 'dynamic',
                        getLabel: 123,
                    },
                },
                message: '"getLabel" must be a function.',
            },
        ];

        for (const config of configs) {
            await t.rejects(async () => {
                await setup(config.value);
            }, new Error(config.message));
        }
    });

    t.test('should cleanup a custom prefix', async (t) => {
        const list = [
            {
                prefix: '.sdffd.',
                expected: 'sdffd',
            },
            {
                prefix: '.sdffd',
                expected: 'sdffd',
            },
            {
                prefix: 'sdffd.',
                expected: 'sdffd',
            },
            {
                prefix: '.sdffd.asdfasdf.',
                expected: 'sdffd.asdfasdf',
            },
            {
                prefix: '.sdffd.asdfasdf',
                expected: 'sdffd.asdfasdf',
            },
            {
                prefix: 'sdffd.asdfasdf.',
                expected: 'sdffd.asdfasdf',
            },
            {
                prefix: 'sdffd',
                expected: 'sdffd',
            },
        ];

        for (const i of list) {
            const server = await setup({
                routes: {
                    prefix: i.prefix,
                },
            });
            t.equal(server.metrics.routesPrefix, i.expected);
        }
    });

    t.test('should allow custom dats client', async (t) => {
        const stub = sinon.stub();

        const datsMock = {
            counter: stub,
            set: stub,
            timing: stub,
            gauge: stub,
            close: stub,
            connect: stub,
        };
        const server = await setup({ client: datsMock });

        await server.inject({
            method: 'GET',
            url: '/',
        });

        t.ok(stub.called);

        t.resolves(
            setup({ client: new Dats({ host: 'udp://localhost:7000' }) })
        );
    });

    t.test(
        'should throw if custom dats client does not have statsd methods',
        async (t) => {
            const generateDatsClient = (missingMethod) => {
                const datsMock = {
                    counter: () => {},
                    set: () => {},
                    timing: () => {},
                    gauge: () => {},
                    close: () => {},
                    connect: () => {},
                };
                delete datsMock[missingMethod];
                return datsMock;
            };

            for (const method of STATSD_METHODS) {
                t.rejects(() => {
                    return setup({
                        client: generateDatsClient(method),
                    });
                }, new Error(`client does not implement ${method} method.`));
            }
        }
    );
});

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

tap.test('metrics collection', async (t) => {
    t.context.statsd = new StatsdMock();
    t.context.address = await t.context.statsd.start();
    t.context.statsdTCP = new StatsdMockTCP();
    t.context.addressTCP = await t.context.statsdTCP.start();
    t.teardown(() =>
        Promise.all([t.context.statsd.stop(), t.context.statsdTCP.stop()])
    );
    t.test('process health metrics', async (t) => {
        const server = await setup({
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'health_test',
            },
            health: {
                sampleInterval: 2000,
            },
        });
        t.teardown(async () => {
            t.context.statsd.removeAllListeners('metric');
            return server.close();
        });
        // const start = process.hrtime();
        await new Promise((resolve, reject) => {
            // let elapsed;
            const regexes = [
                /health_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
                /health_test\.process\.mem\.rss:\d+(\.\d+)?|g/,
                /health_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                /health_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                /health_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                /health_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                /health_test\.process\.cpu:\d+(\.\d+)?\|g/,
            ];
            let cursor = 0;
            t.context.statsd.on('metric', (buffer) => {
                try {
                    // Too flaky on CI for now.
                    // if (!elapsed) {
                    //     elapsed = process.hrtime(start);
                    //     const ms = server.hrtime2ms(elapsed);
                    //     t.ok(ms >= 2000);
                    // }
                    const metric = buffer.toString();
                    t.match(metric, regexes[cursor], `${metric} is not listed`);
                    cursor++;
                    if (cursor >= regexes.length) {
                        resolve();
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
    });

    t.test('routes metrics', async (t) => {
        t.test('static mode', async (t) => {
            t.autoend(true);
            async function setup(opts = {}, cb) {
                if (!cb) {
                    cb = (req, res) => {
                        const fastifyPrefix = req.context.config.metrics
                            .fastifyPrefix
                            ? `${req.context.config.metrics.fastifyPrefix}.`
                            : req.context.config.metrics.fastifyPrefix;
                        const routePrefix = req.context.config.metrics
                            .routesPrefix
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
                        mode: 'static',
                    },
                    health: false,
                };
                const app = fastify();
                app.register(plugin, pluginOpts);

                app.get('/no-metrics', async function (request, reply) {
                    reply.sendTimingMetric('time', 1);
                    reply.sendCounterMetric('count', 1);
                    reply.sendGaugeMetric('gauge', 1);
                    reply.sendSetMetric('set', 1);
                    request.sendTimingMetric('time', 1);
                    request.sendCounterMetric('count', 1);
                    request.sendGaugeMetric('gauge', 1);
                    request.sendSetMetric('set', 1);
                    return { ok: true };
                });

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
                    { config: { metrics: { routeId: 'myId-1' } } },
                    async function () {
                        return { ok: true };
                    }
                );
                app.get(
                    '/reply-decorators',
                    {
                        config: {
                            metrics: {
                                routeId: 'noId',
                            },
                        },
                    },
                    async function (request, reply) {
                        reply.sendTimingMetric('time', 1);
                        reply.sendCounterMetric('count', 1);
                        reply.sendGaugeMetric('gauge', 1);
                        reply.sendSetMetric('set', 1);
                        cb(request, reply);
                        return { ok: true };
                    }
                );
                app.get(
                    '/reply-decorators/id',
                    { config: { metrics: { routeId: 'replyId-1' } } },
                    async function (request, reply) {
                        reply.sendTimingMetric('time', 1);
                        reply.sendCounterMetric('count', 1);
                        reply.sendGaugeMetric('gauge', 1);
                        reply.sendSetMetric('set', 1);
                        cb(request, reply);
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
                app.register(
                    async function (f) {
                        f.get(
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
                        f.get(
                            '/id',
                            { config: { metrics: { routeId: 'myId-2' } } },
                            async function () {
                                return { ok: true };
                            }
                        );
                        f.get(
                            '/reply-decorators',
                            {
                                config: {
                                    metrics: {
                                        routeId: 'noId',
                                    },
                                },
                            },
                            async function (request, reply) {
                                reply.sendTimingMetric('time', 1);
                                reply.sendCounterMetric('count', 1);
                                reply.sendGaugeMetric('gauge', 1);
                                reply.sendSetMetric('set', 1);
                                cb(request, reply);
                                return { ok: true };
                            }
                        );
                        f.get(
                            '/reply-decorators/id',
                            { config: { metrics: { routeId: 'replyId-2' } } },
                            async function (request, reply) {
                                reply.sendTimingMetric('time', 1);
                                reply.sendCounterMetric('count', 1);
                                reply.sendGaugeMetric('gauge', 1);
                                reply.sendSetMetric('set', 1);
                                cb(request, reply);
                                return { ok: true };
                            }
                        );
                        f.get(
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
                    },
                    { prefix: '/static/test' }
                );
                await app.ready();
                return app;
            }
            t.test('default metrics', async (t) => {
                const app = await setup({
                    client: {
                        namespace: 'static_routes_test',
                    },
                });
                t.teardown(async () => {
                    t.context.statsd.removeAllListeners('metric');
                    return app.close();
                });
                await Promise.all([
                    (async () => {
                        for (const url of [
                            '/no-metrics',
                            '/',
                            '/id',
                            '/oops',
                            '/static/test',
                            '/static/test/id',
                            '/static/test/oops',
                            '/reply-decorators',
                            '/reply-decorators/id',
                            '/static/test/reply-decorators',
                            '/static/test/reply-decorators/id',
                        ]) {
                            await app.inject({
                                method: 'GET',
                                url,
                            });
                        }
                    })(),
                    new Promise((resolve) => {
                        const regexes = [
                            /static_routes_test\.noId\.requests:1\|c/,
                            /static_routes_test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_test\.myId-1\.requests:1\|c/,
                            /static_routes_test\.myId-1\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_test\.noId\.requests:1\|c/,
                            /static_routes_test\.noId\.errors\.500:1\|c/,
                            /static_routes_test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_test\.static\.test\.noId\.requests:1\|c/,
                            /static_routes_test\.static\.test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_test\.static\.test\.myId-2\.requests:1\|c/,
                            /static_routes_test\.static\.test\.myId-2\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_test\.static\.test\.noId\.requests:1\|c/,
                            /static_routes_test\.static\.test\.noId\.errors\.500:1\|c/,
                            /static_routes_test\.static\.test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_test\.noId\.requests:1\|c/,
                            /static_routes_test\.noId\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_test\.noId\.count:1\|c/,
                            /static_routes_test\.noId\.gauge:1\|g/,
                            /static_routes_test\.noId\.set:1\|s/,
                            /static_routes_test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_test\.replyId-1\.requests:1\|c/,
                            /static_routes_test\.replyId-1\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_test\.replyId-1\.count:1\|c/,
                            /static_routes_test\.replyId-1\.gauge:1\|g/,
                            /static_routes_test\.replyId-1\.set:1\|s/,
                            /static_routes_test\.replyId-1\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_test\.static\.test\.noId\.requests:1\|c/,
                            /static_routes_test\.static\.test\.noId\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_test\.static\.test\.noId\.count:1\|c/,
                            /static_routes_test\.static\.test\.noId\.gauge:1\|g/,
                            /static_routes_test\.static\.test\.noId\.set:1\|s/,
                            /static_routes_test\.static\.test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_test\.static\.test\.replyId-2\.requests:1\|c/,
                            /static_routes_test\.static\.test\.replyId-2\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_test\.static\.test\.replyId-2\.count:1\|c/,
                            /static_routes_test\.static\.test\.replyId-2\.gauge:1\|g/,
                            /static_routes_test\.static\.test\.replyId-2\.set:1\|s/,
                            /static_routes_test\.static\.test\.replyId-2\.response_time:\d+(\.\d+)?\|ms/,
                        ];
                        let cursor = 0;
                        t.context.statsd.on('metric', (buffer) => {
                            const metric = buffer.toString();
                            t.match(
                                metric,
                                regexes[cursor],
                                `${metric} is not listed`
                            );
                            cursor++;
                            if (cursor >= regexes.length) {
                                resolve();
                            }
                        });
                    }),
                ]);
            });

            t.test('custom prefix', async (t) => {
                const app = await setup({
                    client: {
                        namespace: 'static_routes_custom_prefix_test',
                    },
                    routes: {
                        prefix: 'prefix',
                    },
                });
                t.teardown(async () => {
                    t.context.statsd.removeAllListeners('metric');
                    return app.close();
                });
                await Promise.all([
                    (async () => {
                        for (const url of [
                            '/',
                            '/id',
                            '/oops',
                            '/static/test',
                            '/static/test/id',
                            '/static/test/oops',
                            '/reply-decorators',
                            '/reply-decorators/id',
                            '/static/test/reply-decorators',
                            '/static/test/reply-decorators/id',
                        ]) {
                            await app.inject({
                                method: 'GET',
                                url,
                            });
                        }
                    })(),
                    new Promise((resolve) => {
                        const regexes = [
                            /static_routes_custom_prefix_test\.prefix\.noId\.requests:1\|c/,
                            /static_routes_custom_prefix_test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_test\.prefix\.myId-1\.requests:1\|c/,
                            /static_routes_custom_prefix_test\.prefix\.myId-1\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_test\.prefix\.noId\.requests:1\|c/,
                            /static_routes_custom_prefix_test\.prefix\.noId\.errors\.500:1\|c/,
                            /static_routes_custom_prefix_test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.requests:1\|c/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_test\.static\.test\.prefix\.myId-2\.requests:1\|c/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.myId-2\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.requests:1\|c/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.errors\.500:1\|c/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_test\.prefix\.noId\.requests:1\|c/,
                            /static_routes_custom_prefix_test\.prefix\.noId\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_prefix_test\.prefix\.noId\.count:1\|c/,
                            /static_routes_custom_prefix_test\.prefix\.noId\.gauge:1\|g/,
                            /static_routes_custom_prefix_test\.prefix\.noId\.set:1\|s/,
                            /static_routes_custom_prefix_test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_test\.prefix\.replyId-1\.requests:1\|c/,
                            /static_routes_custom_prefix_test\.prefix\.replyId-1\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_prefix_test\.prefix\.replyId-1\.count:1\|c/,
                            /static_routes_custom_prefix_test\.prefix\.replyId-1\.gauge:1\|g/,
                            /static_routes_custom_prefix_test\.prefix\.replyId-1\.set:1\|s/,
                            /static_routes_custom_prefix_test\.prefix\.replyId-1\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.requests:1\|c/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.count:1\|c/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.gauge:1\|g/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.set:1\|s/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_test\.static\.test\.prefix\.replyId-2\.requests:1\|c/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.replyId-2\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.replyId-2\.count:1\|c/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.replyId-2\.gauge:1\|g/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.replyId-2\.set:1\|s/,
                            /static_routes_custom_prefix_test\.static\.test\.prefix\.replyId-2\.response_time:\d+(\.\d+)?\|ms/,
                        ];
                        let cursor = 0;
                        t.context.statsd.on('metric', (buffer) => {
                            const metric = buffer.toString();
                            t.match(
                                metric,
                                regexes[cursor],
                                `${metric} is not listed`
                            );
                            cursor++;
                            if (cursor >= regexes.length) {
                                resolve();
                            }
                        });
                    }),
                ]);
            });

            t.test('custom getLabel', async (t) => {
                const app = await setup(
                    {
                        client: {
                            namespace: 'static_routes_custom_getlabel_test',
                        },
                        routes: {
                            getLabel: function (options) {
                                t.ok(typeof options.prefix === 'string');
                                t.ok(options.config);
                                t.ok(options.config.metrics);
                                t.ok(
                                    options.config.metrics.routesPrefix === ''
                                );
                                t.equal(
                                    'string',
                                    typeof options.config.metrics.routeId
                                );
                                t.equal(
                                    'string',
                                    typeof options.config.metrics.fastifyPrefix
                                );
                                t.ok(options.method);
                                t.ok(options.url);
                                t.ok(options.path);
                                t.ok(options.handler);
                                return 'customLabel';
                            },
                        },
                    },
                    (req, res) => {
                        t.equal(req.getMetricLabel(), 'customLabel');
                        t.equal(res.getMetricLabel(), 'customLabel');
                    }
                );
                t.teardown(async () => {
                    t.context.statsd.removeAllListeners('metric');
                    return app.close();
                });
                await Promise.all([
                    (async function requests() {
                        const urls = [
                            '/',
                            '/id',
                            '/oops',
                            '/static/test',
                            '/static/test/id',
                            '/static/test/oops',
                            '/reply-decorators',
                            '/reply-decorators/id',
                            '/static/test/reply-decorators',
                            '/static/test/reply-decorators/id',
                        ];
                        for (const url of urls) {
                            await app.inject({
                                method: 'GET',
                                url,
                            });
                        }
                    })(),
                    new Promise((resolve) => {
                        const expected = [
                            /static_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.errors\.500:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.errors\.500:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_getlabel_test\.customLabel\.count:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.gauge:1\|g/,
                            /static_routes_custom_getlabel_test\.customLabel\.set:1\|s/,
                            /static_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_getlabel_test\.customLabel\.count:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.gauge:1\|g/,
                            /static_routes_custom_getlabel_test\.customLabel\.set:1\|s/,
                            /static_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_getlabel_test\.customLabel\.count:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.gauge:1\|g/,
                            /static_routes_custom_getlabel_test\.customLabel\.set:1\|s/,
                            /static_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_getlabel_test\.customLabel\.count:1\|c/,
                            /static_routes_custom_getlabel_test\.customLabel\.gauge:1\|g/,
                            /static_routes_custom_getlabel_test\.customLabel\.set:1\|s/,
                            /static_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,
                        ];
                        let cursor = 0;
                        t.context.statsd.on('metric', (buffer) => {
                            const metric = buffer.toString();
                            t.match(
                                metric,
                                expected[cursor],
                                `${metric} is not listed`
                            );
                            cursor++;
                            if (cursor >= expected.length) {
                                resolve();
                            }
                        });
                    }),
                ]);
            });

            t.test('custom getLabel and custom prefix', async (t) => {
                const app = await setup(
                    {
                        client: {
                            namespace:
                                'static_routes_custom_prefix_getlabel_test',
                        },
                        routes: {
                            prefix: 'prefix',
                            getLabel: function (options) {
                                t.ok(typeof options.prefix === 'string');
                                t.ok(options.config);
                                t.ok(options.config.metrics);
                                t.ok(
                                    options.config.metrics.routesPrefix ===
                                        'prefix'
                                );
                                t.equal(
                                    'string',
                                    typeof options.config.metrics.routeId
                                );
                                t.equal(
                                    'string',
                                    typeof options.config.metrics.fastifyPrefix
                                );
                                t.ok(options.method);
                                t.ok(options.url);
                                t.ok(options.path);
                                t.ok(options.handler);
                                return 'customLabel';
                            },
                        },
                    },
                    (req, res) => {
                        t.equal(req.getMetricLabel(), 'customLabel');
                        t.equal(res.getMetricLabel(), 'customLabel');
                    }
                );
                t.teardown(async () => {
                    t.context.statsd.removeAllListeners('metric');
                    return app.close();
                });
                await Promise.all([
                    (async function requests() {
                        const urls = [
                            '/',
                            '/id',
                            '/oops',
                            '/static/test',
                            '/static/test/id',
                            '/static/test/oops',
                            '/reply-decorators',
                            '/reply-decorators/id',
                            '/static/test/reply-decorators',
                            '/static/test/reply-decorators/id',
                        ];
                        for (const url of urls) {
                            await app.inject({
                                method: 'GET',
                                url,
                            });
                        }
                    })(),
                    new Promise((resolve) => {
                        const expected = [
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.errors\.500:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.errors\.500:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.count:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.gauge:1\|g/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.set:1\|s/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.count:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.gauge:1\|g/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.set:1\|s/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.count:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.gauge:1\|g/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.set:1\|s/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /static_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.count:1\|c/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.gauge:1\|g/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.set:1\|s/,
                            /static_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,
                        ];
                        let cursor = 0;
                        t.context.statsd.on('metric', (buffer) => {
                            const metric = buffer.toString();
                            t.match(
                                metric,
                                expected[cursor],
                                `${metric} is not listed`
                            );
                            cursor++;
                            if (cursor >= expected.length) {
                                resolve();
                            }
                        });
                    }),
                ]);
            });
        });

        t.test('dynamic mode', async (t) => {
            t.autoend(true);
            async function setup(opts = {}, cb) {
                if (!cb) {
                    cb = (req, res) => {
                        const fastifyPrefix = req.context.config.metrics
                            .fastifyPrefix
                            ? `${req.context.config.metrics.fastifyPrefix}.`
                            : req.context.config.metrics.fastifyPrefix;
                        const routePrefix = req.context.config.metrics
                            .routesPrefix
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
                        mode: 'dynamic',
                    },
                    health: false,
                };
                const app = fastify();
                app.register(plugin, pluginOpts);
                app.register(async function (f) {
                    f.get('/no-metrics', async function (request, reply) {
                        reply.sendTimingMetric('time', 1);
                        reply.sendCounterMetric('count', 1);
                        reply.sendGaugeMetric('gauge', 1);
                        reply.sendSetMetric('set', 1);
                        request.sendTimingMetric('time', 1);
                        request.sendCounterMetric('count', 1);
                        request.sendGaugeMetric('gauge', 1);
                        request.sendSetMetric('set', 1);
                        return { ok: true };
                    });
                    f.get(
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
                    f.get(
                        '/id',
                        { config: { metrics: { routeId: 'myId-1' } } },
                        async function () {
                            return { ok: true };
                        }
                    );
                    f.get(
                        '/reply-decorators',
                        {
                            config: {
                                metrics: {
                                    routeId: 'noId',
                                },
                            },
                        },
                        async function (request, reply) {
                            reply.sendTimingMetric('time', 1);
                            reply.sendCounterMetric('count', 1);
                            reply.sendGaugeMetric('gauge', 1);
                            reply.sendSetMetric('set', 1);
                            cb(request, reply);
                            return { ok: true };
                        }
                    );
                    f.get(
                        '/reply-decorators/id',
                        { config: { metrics: { routeId: 'replyId-1' } } },
                        async function (request, reply) {
                            reply.sendTimingMetric('time', 1);
                            reply.sendCounterMetric('count', 1);
                            reply.sendGaugeMetric('gauge', 1);
                            reply.sendSetMetric('set', 1);
                            cb(request, reply);
                            return { ok: true };
                        }
                    );
                    f.get(
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
                });
                app.register(
                    async function (f) {
                        f.get('/no-metrics', async function (request, reply) {
                            reply.sendTimingMetric('time', 1);
                            reply.sendCounterMetric('count', 1);
                            reply.sendGaugeMetric('gauge', 1);
                            reply.sendSetMetric('set', 1);
                            request.sendTimingMetric('time', 1);
                            request.sendCounterMetric('count', 1);
                            request.sendGaugeMetric('gauge', 1);
                            request.sendSetMetric('set', 1);
                            return { ok: true };
                        });
                        f.get(
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
                        f.get(
                            '/id',
                            { config: { metrics: { routeId: 'myId-2' } } },
                            async function () {
                                return { ok: true };
                            }
                        );
                        f.get(
                            '/reply-decorators',
                            {
                                config: {
                                    metrics: {
                                        routeId: 'noId',
                                    },
                                },
                            },
                            async function (request, reply) {
                                reply.sendTimingMetric('time', 1);
                                reply.sendCounterMetric('count', 1);
                                reply.sendGaugeMetric('gauge', 1);
                                reply.sendSetMetric('set', 1);
                                cb(request, reply);
                                return { ok: true };
                            }
                        );
                        f.get(
                            '/reply-decorators/id',
                            { config: { metrics: { routeId: 'replyId-2' } } },
                            async function (request, reply) {
                                reply.sendTimingMetric('time', 1);
                                reply.sendCounterMetric('count', 1);
                                reply.sendGaugeMetric('gauge', 1);
                                reply.sendSetMetric('set', 1);
                                cb(request, reply);
                                return { ok: true };
                            }
                        );
                        f.get(
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
                    },
                    { prefix: '/dynamic/test' }
                );
                await app.ready();
                return app;
            }

            t.test('default metrics', async (t) => {
                const app = await setup({
                    client: {
                        namespace: 'dynamic_routes_test',
                    },
                });
                t.teardown(async () => {
                    t.context.statsd.removeAllListeners('metric');
                    return app.close();
                });
                await Promise.all([
                    (async () => {
                        for (const url of [
                            'no-metrics',
                            '/dynamic/test/no-metrics',
                            '/',
                            '/id',
                            '/oops',
                            '/dynamic/test',
                            '/dynamic/test/id',
                            '/dynamic/test/oops',
                            '/reply-decorators',
                            '/reply-decorators/id',
                            '/dynamic/test/reply-decorators',
                            '/dynamic/test/reply-decorators/id',
                        ]) {
                            await app.inject({
                                method: 'GET',
                                url,
                            });
                        }
                    })(),
                    new Promise((resolve) => {
                        const regexes = [
                            /dynamic_routes_test\.noId\.requests:1\|c/,
                            /dynamic_routes_test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_test\.myId-1\.requests:1\|c/,
                            /dynamic_routes_test\.myId-1\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_test\.noId\.requests:1\|c/,
                            /dynamic_routes_test\.noId\.errors\.500:1\|c/,
                            /dynamic_routes_test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_test\.dynamic\.test\.noId\.requests:1\|c/,
                            /dynamic_routes_test\.dynamic\.test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_test\.dynamic\.test\.myId-2\.requests:1\|c/,
                            /dynamic_routes_test\.dynamic\.test\.myId-2\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_test\.dynamic\.test\.noId\.requests:1\|c/,
                            /dynamic_routes_test\.dynamic\.test\.noId\.errors\.500:1\|c/,
                            /dynamic_routes_test\.dynamic\.test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_test\.noId\.requests:1\|c/,
                            /dynamic_routes_test\.noId\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_test\.noId\.count:1\|c/,
                            /dynamic_routes_test\.noId\.gauge:1\|g/,
                            /dynamic_routes_test\.noId\.set:1\|s/,
                            /dynamic_routes_test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_test\.replyId-1\.requests:1\|c/,
                            /dynamic_routes_test\.replyId-1\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_test\.replyId-1\.count:1\|c/,
                            /dynamic_routes_test\.replyId-1\.gauge:1\|g/,
                            /dynamic_routes_test\.replyId-1\.set:1\|s/,
                            /dynamic_routes_test\.replyId-1\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_test\.dynamic\.test\.noId\.requests:1\|c/,
                            /dynamic_routes_test\.dynamic\.test\.noId\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_test\.dynamic\.test\.noId\.count:1\|c/,
                            /dynamic_routes_test\.dynamic\.test\.noId\.gauge:1\|g/,
                            /dynamic_routes_test\.dynamic\.test\.noId\.set:1\|s/,
                            /dynamic_routes_test\.dynamic\.test\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_test\.dynamic\.test\.replyId-2\.requests:1\|c/,
                            /dynamic_routes_test\.dynamic\.test\.replyId-2\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_test\.dynamic\.test\.replyId-2\.count:1\|c/,
                            /dynamic_routes_test\.dynamic\.test\.replyId-2\.gauge:1\|g/,
                            /dynamic_routes_test\.dynamic\.test\.replyId-2\.set:1\|s/,
                            /dynamic_routes_test\.dynamic\.test\.replyId-2\.response_time:\d+(\.\d+)?\|ms/,
                        ];
                        let cursor = 0;
                        t.context.statsd.on('metric', (buffer) => {
                            const metric = buffer.toString();
                            t.match(
                                metric,
                                regexes[cursor],
                                `${metric} is not listed`
                            );
                            cursor++;
                            if (cursor >= regexes.length) {
                                resolve();
                            }
                        });
                    }),
                ]);
            });

            t.test('custom prefix', async (t) => {
                const app = await setup({
                    client: {
                        namespace: 'dynamic_routes_custom_prefix_test',
                    },
                    routes: {
                        prefix: 'prefix',
                    },
                });
                t.teardown(async () => {
                    t.context.statsd.removeAllListeners('metric');
                    return app.close();
                });
                await Promise.all([
                    (async () => {
                        for (const url of [
                            '/',
                            '/id',
                            '/oops',
                            '/dynamic/test',
                            '/dynamic/test/id',
                            '/dynamic/test/oops',
                            '/reply-decorators',
                            '/reply-decorators/id',
                            '/dynamic/test/reply-decorators',
                            '/dynamic/test/reply-decorators/id',
                        ]) {
                            await app.inject({
                                method: 'GET',
                                url,
                            });
                        }
                    })(),
                    new Promise((resolve) => {
                        const regexes = [
                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_test\.prefix\.myId-1\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_test\.prefix\.myId-1\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.errors\.500:1\|c/,
                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.myId-2\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.myId-2\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.errors\.500:1\|c/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.count:1\|c/,
                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.gauge:1\|g/,
                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.set:1\|s/,
                            /dynamic_routes_custom_prefix_test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_test\.prefix\.replyId-1\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_test\.prefix\.replyId-1\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_prefix_test\.prefix\.replyId-1\.count:1\|c/,
                            /dynamic_routes_custom_prefix_test\.prefix\.replyId-1\.gauge:1\|g/,
                            /dynamic_routes_custom_prefix_test\.prefix\.replyId-1\.set:1\|s/,
                            /dynamic_routes_custom_prefix_test\.prefix\.replyId-1\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.count:1\|c/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.gauge:1\|g/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.set:1\|s/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.noId\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.replyId-2\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.replyId-2\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.replyId-2\.count:1\|c/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.replyId-2\.gauge:1\|g/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.replyId-2\.set:1\|s/,
                            /dynamic_routes_custom_prefix_test\.dynamic\.test\.prefix\.replyId-2\.response_time:\d+(\.\d+)?\|ms/,
                        ];
                        let cursor = 0;
                        t.context.statsd.on('metric', (buffer) => {
                            const metric = buffer.toString();
                            t.match(
                                metric,
                                regexes[cursor],
                                `${metric} is not listed`
                            );
                            cursor++;
                            if (cursor >= regexes.length) {
                                resolve();
                            }
                        });
                    }),
                ]);
            });

            t.test('custom getLabel', async (t) => {
                const app = await setup(
                    {
                        client: {
                            namespace: 'dynamic_routes_custom_getlabel_test',
                        },
                        routes: {
                            getLabel: function (request, reply) {
                                t.ok(typeof this.prefix === 'string');
                                t.ok(
                                    typeof this.metrics.routesPrefix ===
                                        'string'
                                );
                                for (const r of [request, reply]) {
                                    t.ok(
                                        typeof r.context.config.metrics ===
                                            'object'
                                    );
                                    t.equal(
                                        'string',
                                        typeof r.context.config.metrics.routeId
                                    );
                                    t.equal(
                                        'string',
                                        typeof r.context.config.metrics
                                            .fastifyPrefix
                                    );
                                    t.equal(
                                        'string',
                                        typeof r.context.config.metrics
                                            .routesPrefix
                                    );
                                }
                                return 'customLabel';
                            },
                        },
                    },
                    (req, res) => {
                        t.equal(req.getMetricLabel(), 'customLabel');
                        t.equal(res.getMetricLabel(), 'customLabel');
                    }
                );
                t.teardown(async () => {
                    t.context.statsd.removeAllListeners('metric');
                    return app.close();
                });
                await Promise.all([
                    (async function requests() {
                        const urls = [
                            '/',
                            '/id',
                            '/oops',
                            '/dynamic/test',
                            '/dynamic/test/id',
                            '/dynamic/test/oops',
                            '/reply-decorators',
                            '/reply-decorators/id',
                            '/dynamic/test/reply-decorators',
                            '/dynamic/test/reply-decorators/id',
                        ];
                        for (const url of urls) {
                            await app.inject({
                                method: 'GET',
                                url,
                            });
                        }
                    })(),
                    new Promise((resolve) => {
                        const expected = [
                            /dynamic_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.errors\.500:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.errors\.500:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.count:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.gauge:1\|g/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.set:1\|s/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.count:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.gauge:1\|g/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.set:1\|s/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.count:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.gauge:1\|g/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.set:1\|s/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.count:1\|c/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.gauge:1\|g/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.set:1\|s/,
                            /dynamic_routes_custom_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,
                        ];
                        let cursor = 0;
                        t.context.statsd.on('metric', (buffer) => {
                            const metric = buffer.toString();
                            t.match(
                                metric,
                                expected[cursor],
                                `${metric} is not listed`
                            );
                            cursor++;
                            if (cursor >= expected.length) {
                                resolve();
                            }
                        });
                    }),
                ]);
            });

            t.test('custom getLabel and custom prefix', async (t) => {
                const app = await setup(
                    {
                        client: {
                            namespace:
                                'dynamic_routes_custom_prefix_getlabel_test',
                        },
                        routes: {
                            prefix: 'prefix',
                            getLabel: function (request, reply) {
                                t.ok(typeof this.prefix === 'string');
                                t.ok(this.metrics.routesPrefix === 'prefix');
                                for (const r of [request, reply]) {
                                    t.ok(
                                        typeof r.context.config.metrics ===
                                            'object'
                                    );
                                    t.equal(
                                        'string',
                                        typeof r.context.config.metrics.routeId
                                    );
                                    t.equal(
                                        'string',
                                        typeof r.context.config.metrics
                                            .fastifyPrefix
                                    );
                                    t.equal(
                                        'string',
                                        typeof r.context.config.metrics
                                            .routesPrefix
                                    );
                                }
                                return 'customLabel';
                            },
                        },
                    },
                    (req, res) => {
                        t.equal(req.getMetricLabel(), 'customLabel');
                        t.equal(res.getMetricLabel(), 'customLabel');
                    }
                );
                t.teardown(async () => {
                    t.context.statsd.removeAllListeners('metric');
                    return app.close();
                });
                await Promise.all([
                    (async function requests() {
                        const urls = [
                            '/',
                            '/id',
                            '/oops',
                            '/dynamic/test',
                            '/dynamic/test/id',
                            '/dynamic/test/oops',
                            '/reply-decorators',
                            '/reply-decorators/id',
                            '/dynamic/test/reply-decorators',
                            '/dynamic/test/reply-decorators/id',
                        ];
                        for (const url of urls) {
                            await app.inject({
                                method: 'GET',
                                url,
                            });
                        }
                    })(),
                    new Promise((resolve) => {
                        const expected = [
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.errors\.500:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.errors\.500:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.count:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.gauge:1\|g/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.set:1\|s/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.count:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.gauge:1\|g/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.set:1\|s/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.count:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.gauge:1\|g/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.set:1\|s/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,

                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.requests:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.time:\d+(\.\d+)?\|ms/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.count:1\|c/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.gauge:1\|g/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.set:1\|s/,
                            /dynamic_routes_custom_prefix_getlabel_test\.customLabel\.response_time:\d+(\.\d+)?\|ms/,
                        ];
                        let cursor = 0;
                        t.context.statsd.on('metric', (buffer) => {
                            const metric = buffer.toString();
                            t.match(
                                metric,
                                expected[cursor],
                                `${metric} is not listed`
                            );
                            cursor++;
                            if (cursor >= expected.length) {
                                resolve();
                            }
                        });
                    }),
                ]);
            });
        });
    });

    t.test('disabling process health metrics', async (t) => {
        const sampleInterval = 10;
        const server = await setup({
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'disable_health_test',
            },
            health: false,
        });
        t.teardown(async () => {
            t.context.statsd.removeAllListeners('metric');
            return server.close();
        });
        t.notOk(server.hasDecorator('doc'));
        await Promise.all([
            server.inject({
                method: 'GET',
                url: '/',
            }),
            new Promise((resolve) => {
                const regexes = [
                    /disable_health_test\.noId\.requests:1\|c/,
                    /disable_health_test\.noId\.response_time:\d+(\.\d+)?\|ms/,
                ];
                const notExpected = [
                    /disable_health_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
                    /disable_health_test\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                    /disable_health_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                    /disable_health_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                    /disable_health_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                    /disable_health_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                    /disable_health_test\.process\.cpu:\d+(\.\d+)?\|g/,
                ];

                let cursor = 0;
                t.context.statsd.on('metric', (buffer) => {
                    const metric = buffer.toString();
                    if (regexes[cursor]) {
                        t.match(
                            metric,
                            regexes[cursor],
                            `${metric} is not listed`
                        );
                    }
                    for (const regex of notExpected) {
                        t.notOk(
                            regex.test(metric),
                            `${metric} wasn't expected, it matched ${regex}`
                        );
                    }
                    cursor++;
                    if (cursor >= regexes.length) {
                        setTimeout(resolve, sampleInterval);
                    }
                });
            }),
        ]);
    });

    t.test('disabling routes timings metric', async (t) => {
        const server = await setup({
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'disable_routes_timings_test',
            },
            routes: {
                timing: false,
            },
        });
        t.teardown(async () => {
            t.context.statsd.removeAllListeners('metric');
            return server.close();
        });
        await Promise.all([
            server.inject({
                method: 'GET',
                url: '/',
            }),
            new Promise((resolve) => {
                const regexes = [
                    /disable_routes_timings_test\.noId\.requests:1\|c/,
                    /disable_routes_timings_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.cpu:\d+(\.\d+)?\|g/,
                ];
                const notExpected =
                    /disable_routes_timings_test\.noId:\d+(\.\d+)?\|ms/;
                let cursor = 0;
                t.context.statsd.on('metric', (buffer) => {
                    const metric = buffer.toString();
                    t.match(metric, regexes[cursor], `${metric} is not listed`);
                    t.notOk(
                        notExpected.test(metric),
                        `${metric} wasn't expected, it matched ${notExpected}`
                    );
                    cursor++;
                    if (cursor >= regexes.length) {
                        resolve();
                    }
                });
            }),
        ]);
    });

    t.test('disabling routes hits metric', async (t) => {
        const server = await setup({
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'disable_routes_hits_test',
            },

            routes: {
                hits: false,
            },
        });
        t.teardown(async () => {
            t.context.statsd.removeAllListeners('metric');
            return server.close();
        });
        await Promise.all([
            server.inject({
                method: 'GET',
                url: '/',
            }),
            new Promise((resolve) => {
                const regexes = [
                    /disable_routes_hits_test\.noId\.response_time:\d+(\.\d+)?\|ms/,
                    /disable_routes_hits_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.cpu:\d+(\.\d+)?\|g/,
                ];
                const notExpected =
                    /disable_routes_hits_test\.noId\.requests:1\|c/;
                let cursor = 0;
                t.context.statsd.on('metric', (buffer) => {
                    const metric = buffer.toString();
                    t.match(metric, regexes[cursor], `${metric} is not listed`);
                    t.notOk(
                        notExpected.test(metric),
                        `${metric} wasn't expected, it matched ${notExpected}`
                    );
                    cursor++;
                    if (cursor >= regexes.length) {
                        resolve();
                    }
                });
            }),
        ]);
    });
    t.test('disabling routes errors metric', async (t) => {
        const server = await setup({
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'disabling_routes_errors_test',
            },

            routes: {
                errors: false,
            },
        });
        t.teardown(async () => {
            t.context.statsd.removeAllListeners('metric');
            return server.close();
        });
        await Promise.all([
            server.inject({
                method: 'GET',
                url: '/oops',
            }),
            new Promise((resolve) => {
                const regexes = [
                    /disabling_routes_errors_test\.noId\.requests:1\|c/,
                    /disabling_routes_errors_test\.noId\.response_time:\d+(\.\d+)?\|ms/,
                    /disabling_routes_errors_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.cpu:\d+(\.\d+)?\|g/,
                ];
                const notExpected =
                    /disabling_routes_errors_test\.errors\.noId\.500:1\|c/;
                let cursor = 0;
                t.context.statsd.on('metric', (buffer) => {
                    const metric = buffer.toString();
                    t.match(metric, regexes[cursor], `${metric} is not listed`);
                    t.notOk(
                        notExpected.test(metric),
                        `${metric} wasn't expected, it matched ${notExpected}`
                    );
                    cursor++;
                    if (cursor >= regexes.length) {
                        resolve();
                    }
                });
            }),
        ]);
    });

    t.test('sending requests metrics TCP', async (t) => {
        t.plan(2);
        const server = await setup({
            client: {
                host: `tcp://127.0.0.1:${t.context.addressTCP.port}`,
                namespace: 'metrics_over_tcp',
            },
            health: {
                sampleInterval: 1000,
            },
        });
        t.teardown(async () => {
            t.context.statsdTCP.removeAllListeners('metric');
            return server.close();
        });
        await Promise.all([
            server.inject({
                method: 'GET',
                url: '/',
            }),
            new Promise((resolve) => {
                const regexes = [
                    /metrics_over_tcp\.noId\.requests:1\|c/,
                    /metrics_over_tcp\.noId\.response_time:\d+(\.\d+)?\|ms/,
                ];
                t.context.statsdTCP.on('metric', (buffer) => {
                    let metrics = buffer.toString().split('\n').filter(Boolean);

                    for (let [i, regex] of regexes.entries()) {
                        t.match(
                            metrics[i],
                            regex,
                            `${metrics[i]} is not listed`
                        );
                    }
                    resolve();
                });
            }),
        ]);
    });

    t.test('disabling all default metrics', async (t) => {
        const sampleInterval = 10;
        const server = await setup({
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'disabling_all_metrics_test',
            },
            routes: {
                timing: false,
                hits: false,
                errors: false,
            },
            health: false,
        });
        t.teardown(async () => {
            t.context.statsd.removeAllListeners('metric');
            return server.close();
        });
        await Promise.all([
            server.inject({
                method: 'GET',
                url: '/',
            }),
            new Promise((resolve) => {
                const metrics = [1.2, 2.1, 1.5];
                const notExpected = [
                    /disabling_all_metrics_test\.requests\.noId:1\|c/,
                    /disabling_all_metrics_test\.noId:\d+(\.\d+)?\|ms/,
                    /disabling_all_metrics_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.cpu:\d+(\.\d+)?\|g/,
                ];
                for (const metric of metrics) {
                    server.metrics.client.timing('some_time', metric);
                }
                let cursor = 0;
                t.context.statsd.on('metric', (buffer) => {
                    const metric = buffer.toString();
                    if (metrics[cursor]) {
                        t.equal(
                            metric,
                            `disabling_all_metrics_test.some_time:${metrics[cursor]}|ms`
                        );
                    }
                    for (const regex of notExpected) {
                        t.notOk(
                            regex.test(metric),
                            `${metric} wasn't expected, it matched ${notExpected}`
                        );
                    }
                    cursor++;
                    if (cursor >= metrics.length) {
                        setTimeout(resolve, sampleInterval);
                    }
                });
            }),
        ]);
    });
});
