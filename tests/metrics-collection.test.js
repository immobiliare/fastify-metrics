'use strict';

const tap = require('tap');
const { StatsdMock } = require('./helpers/statsd');
const StatsdMockTCP = require('./helpers/statsdTCP');
const { checkMetrics } = require('./helpers/tester');
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

tap.beforeEach(async (t) => {
    t.context = {};
    t.context.statsd = new StatsdMock();
    t.context.address = await t.context.statsd.start();
    t.context.statsdTCP = new StatsdMockTCP();
    t.context.addressTCP = await t.context.statsdTCP.start();
});

tap.afterEach((t) =>
    Promise.all([t.context.statsd.stop(), t.context.statsdTCP.stop()])
);

tap.test('process health metrics', async (t) => {
    const server = await setupRoutes(
        {
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'health_test',
            },
            health: {
                sampleInterval: 2000,
            },
        },
        routes,
        false
    );
    t.teardown(async () => {
        t.context.statsd.removeAllListeners('metric');
        return server.close();
    });
    // const start = process.hrtime();
    await checkMetrics(
        [
            /health_test\.process\.mem\.external:\d+(\.\d+)?\|g/,
            /health_test\.process\.mem\.rss:\d+(\.\d+)?|g/,
            /health_test\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
            /health_test\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
            /health_test\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
            /health_test\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
            /health_test\.process\.cpu:\d+(\.\d+)?\|g/,
        ],
        t
    );
});

tap.test('disabling process health metrics', async (t) => {
    const sampleInterval = 1000;
    const server = await setupRoutes(
        {
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'disable_health_test',
            },
            health: false,
        },
        routes,
        false
    );
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
                    t.match(metric, regexes[cursor], `${metric} is not listed`);
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

tap.test('disabling routes timings metric', async (t) => {
    const server = await setupRoutes(
        {
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'disable_routes_timings_test',
            },
            routes: {
                timing: false,
            },
        },
        routes,
        false
    );
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

tap.test('disabling routes hits metric', async (t) => {
    const server = await setupRoutes(
        {
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'disable_routes_hits_test',
            },

            routes: {
                hits: false,
            },
        },
        routes,
        false
    );
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
            const notExpected = /disable_routes_hits_test\.noId\.requests:1\|c/;
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

tap.test('disabling routes errors metric', async (t) => {
    const server = await setupRoutes(
        {
            client: {
                host: `udp://127.0.0.1:${t.context.address.port}`,
                namespace: 'disabling_routes_errors_test',
            },

            routes: {
                errors: false,
            },
        },
        routes,
        false
    );
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

tap.test('sending requests metrics TCP', async (t) => {
    t.plan(2);
    const server = await setupRoutes(
        {
            client: {
                host: `tcp://127.0.0.1:${t.context.addressTCP.port}`,
                namespace: 'metrics_over_tcp',
            },
            health: {
                sampleInterval: 1000,
            },
        },
        routes,
        false
    );
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
                    t.match(metrics[i], regex, `${metrics[i]} is not listed`);
                }
                resolve();
            });
        }),
    ]);
});

tap.test('disabling all default metrics', async (t) => {
    const sampleInterval = 10;
    const server = await setupRoutes(
        {
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
        },
        routes,
        false
    );
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
