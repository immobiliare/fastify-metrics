'use strict';

const tap = require('tap');
const sinon = require('sinon');
const { StatsdMock } = require('./helpers/statsd');
const StatsdMockTCP = require('./helpers/statsdTCP');
const { hrtime2ms } = require('@dnlup/hrtime-utils');

const PLUGIN_METHODS = [
    'counter',
    'timing',
    'gauge',
    'set',
    'close',
    'connect',
];

async function setup(options) {
    const server = require('fastify')();
    server.register(require('../'), options);
    server.get('/', (request, reply) => {
        reply.send('ok');
    });
    server.get('/oops', async () => {
        throw new Error('Oops');
    });
    await server.ready();
    return server;
}

tap.test('configuration validation', async (t) => {
    t.test('valid otions', async (t) => {
        const configs = [
            {
                value: undefined,
            },
            {
                value: {
                    host: 'udp://172.0.0.100:123',
                    namespace: 'ns',
                },
            },
            {
                value: {
                    sampleInterval: 2000,
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
                    timing: 'true',
                },
                message: '"timing" must be a Boolean.',
            },
            {
                value: {
                    hits: 1,
                },
                message: '"hits" must be a Boolean.',
            },
            {
                value: {
                    errors: {},
                },
                message: '"errors" must be a Boolean.',
            },
            {
                value: {
                    health: [],
                },
                message: '"health" must be a Boolean.',
            },
        ];

        for (const config of configs) {
            await t.rejects(async () => {
                await setup({
                    collect: config.value,
                });
            }, new Error(config.message));
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
        const server = await setup({ customDatsClient: datsMock });

        await server.inject({
            method: 'GET',
            url: '/',
        });

        t.ok(stub.called);
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

            for (const method of PLUGIN_METHODS) {
                t.rejects(() => {
                    return setup({
                        customDatsClient: generateDatsClient(method),
                    });
                }, new Error(`customDatsClient does not implement ${method} method.`));
            }
        }
    );
});

tap.test('decorators', async (t) => {
    t.test('default decorators', async (t) => {
        const server = await setup({
            host: 'udp://127.0.0.1:12000',
        });
        t.ok(server.hasDecorator('stats'));
        t.ok(server.hasDecorator('doc'));
        t.ok(server.hasDecorator('hrtime2ns'));
        t.ok(server.hasDecorator('hrtime2ms'));
        t.ok(server.hasDecorator('hrtime2s'));
        for (const method of PLUGIN_METHODS) {
            t.equal('function', typeof server.stats[method]);
        }
    });

    t.test('without sampler', async (t) => {
        const server = await setup({
            host: 'udp://127.0.0.1:12000',
            collect: {
                health: false,
            },
        });
        t.ok(server.hasDecorator('stats'));
        t.notOk(server.hasDecorator('doc'));
        t.ok(server.hasDecorator('hrtime2ns'));
        t.ok(server.hasDecorator('hrtime2ms'));
        t.ok(server.hasDecorator('hrtime2s'));
        for (const method of PLUGIN_METHODS) {
            t.equal('function', typeof server.stats[method]);
        }
    });
});

tap.test('hooks', async (t) => {
    t.test('fastify close', async (t) => {
        const server = await setup({
            host: `udp://127.0.0.1:7000`,
            namespace: 'ns',
        });
        t.resolves(server.close());
    });
    t.test('fastify close with mocked client', async (t) => {
        const server = await setup();
        t.resolves(server.close());
    });
    t.test('dats onError', async (t) => {
        const server = await setup({
            host: `udp://127.0.0.1:7000`,
            namespace: 'ns',
        });
        t.teardown(() => server.close());
        const spy = sinon.spy(server.log, 'error');
        server.stats.socket.onError(new Error('test'));
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
            host: `udp://127.0.0.1:${t.context.address.port}`,
            namespace: 'health_test',
            sampleInterval: 2000,
        });
        t.teardown(async () => {
            t.context.statsd.removeAllListeners('metric');
            return server.close();
        });
        const start = process.hrtime();
        await new Promise((resolve, reject) => {
            let elapsed;
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
                    if (!elapsed) {
                        elapsed = process.hrtime(start);
                        const ms = hrtime2ms(elapsed);
                        t.ok(ms >= 2000 && ms <= 3000);
                    }
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

    t.test('routes hits and timing metrics', async (t) => {
        const server = await setup({
            host: `udp://127.0.0.1:${t.context.address.port}`,
            namespace: 'routes_test',
            sampleInterval: 2000,
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
                    /routes_test\.api\.noId\.requests:1\|c/,
                    /routes_test\.api\.noId.response_time:\d+(\.\d+)?\|ms/,
                ];
                let cursor = 0;
                t.context.statsd.on('metric', (buffer) => {
                    const metric = buffer.toString();
                    t.match(metric, regexes[cursor], `${metric} is not listed`);
                    cursor++;
                    if (cursor >= regexes.length) {
                        resolve();
                    }
                });
            }),
        ]);
    });

    t.test('routes errors metric', async (t) => {
        const server = await setup({
            host: `udp://127.0.0.1:${t.context.address.port}`,
            namespace: 'routes_errors_test',
            sampleInterval: 2000,
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
                    /routes_errors_test\.api\.noId\.requests:1\|c/,
                    /routes_errors_test\.api\.noId\.errors\.500:1\|c/,
                    /routes_errors_test\.api\.noId.response_time:\d+(\.\d+)?\|ms/,
                ];
                let cursor = 0;
                t.context.statsd.on('metric', (buffer) => {
                    const metric = buffer.toString();
                    t.match(metric, regexes[cursor], `${metric} is not listed`);
                    cursor++;
                    if (cursor >= regexes.length) {
                        resolve();
                    }
                });
            }),
        ]);
    });

    t.test('disabling process health metrics', async (t) => {
        const sampleInterval = 10;
        const server = await setup({
            host: `udp://127.0.0.1:${t.context.address.port}`,
            sampleInterval,
            namespace: 'disable_health_test',
            collect: {
                health: false,
            },
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
                    /disable_health_test\.api.noId\.requests:1\|c/,
                    /disable_health_test\.api\.noId.response_time:\d+(\.\d+)?\|ms/,
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
            host: `udp://127.0.0.1:${t.context.address.port}`,
            namespace: 'disable_routes_timings_test',
            collect: {
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
                    /disable_routes_timings_test\.api\.noId\.requests:1\|c/,
                    /disable_routes_timings_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                    /disable_routes_timings_test\.process\.cpu:\d+(\.\d+)?\|g/,
                ];
                const notExpected =
                    /disable_routes_timings_test\.api\.noId:\d+(\.\d+)?\|ms/;
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
            host: `udp://127.0.0.1:${t.context.address.port}`,
            namespace: 'disable_routes_hits_test',
            collect: {
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
                    /disable_routes_hits_test\.api\.noId\.response_time:\d+(\.\d+)?\|ms/,
                    /disable_routes_hits_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                    /disable_routes_hits_test\.process\.cpu:\d+(\.\d+)?\|g/,
                ];
                const notExpected =
                    /disable_routes_hits_test\.api\.noId\.requests:1\|c/;
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
            host: `udp://127.0.0.1:${t.context.address.port}`,
            namespace: 'disabling_routes_errors_test',
            collect: {
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
                    /disabling_routes_errors_test\.api\.noId\.requests:1\|c/,
                    /disabling_routes_errors_test\.api\.noId\.response_time:\d+(\.\d+)?\|ms/,
                    /disabling_routes_errors_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                    /disabling_routes_errors_test\.process\.cpu:\d+(\.\d+)?\|g/,
                ];
                const notExpected =
                    /disabling_routes_errors_test\.api\.errors\.noId\.500:1\|c/;
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
            host: `tcp://127.0.0.1:${t.context.addressTCP.port}`,
            namespace: 'ns',
            sampleInterval: 1000,
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
                    /ns\.api\.noId\.requests:1\|c/,
                    /ns\.api\.noId.response_time:\d+(\.\d+)?\|ms/,
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
            host: `udp://127.0.0.1:${t.context.address.port}`,
            sampleInterval,
            namespace: 'disabling_all_metrics_test',
            collect: {
                timing: false,
                hits: false,
                errors: false,
                health: false,
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
                const metrics = [1.2, 2.1, 1.5];
                const notExpected = [
                    /disabling_all_metrics_test\.api\.requests\.noId:1\|c/,
                    /disabling_all_metrics_test\.api\.noId:\d+(\.\d+)?\|ms/,
                    /disabling_all_metrics_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                    /disabling_all_metrics_test\.process\.cpu:\d+(\.\d+)?\|g/,
                ];
                for (const metric of metrics) {
                    server.stats.timing('some_time', metric);
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
