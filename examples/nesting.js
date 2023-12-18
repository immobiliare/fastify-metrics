/**
 * In this example we show a possible way to nest multiple instances of the plugin using the
 * fastify plugin system and the `routes.prefix` setting of the plugin.
 *
 * Launch the example
 * $ node ./examples/nesting.js
 *
 * Then make a request to the `/with-metrics` enpoints to see the request stats.
 *
 * $ curl localhost:3000/fastify-prefix-1/with-metrics
 * $ curl -X POST -d '{ "test": true }' -H 'content-type: application/json' localhost:3000/fastify-prefix-1/with-metrics
 *
 * $ curl localhost:3000/fastify-prefix-2/with-metrics
 * $ curl -X POST -d '{ "test": true }' -H 'content-type: application/json' localhost:3000/fastify-prefix-2/with-metrics
 */

'use strict';

const fastify = require('fastify');
const plugin = require('..');
const { UdpMock, dumpMetric } = require('./fixtures/statsd');
const { start } = require('./util');

const udpPort = 10000;
const fastifyPort = 3000;

const mock = new UdpMock();
mock.on('metric', dumpMetric);

const app = fastify();

app.register(plugin, {
    client: {
        host: `udp://127.0.0.1:${udpPort}`,
        namespace: 'nesting_upd_test',
    },
    routes: false,
}).then(() => {
    app.register(
        async function (f) {
            // Here we re-use the client already instantiated and track only
            // the routes metrics.
            f.register(plugin, {
                client: app.metrics.client,
                routes: {
                    prefix: 'my-prefix-1',
                },
                health: false,
            });
            f.get(
                '/with-metrics',
                {
                    config: {
                        metrics: {
                            routeId: 'getMetrics',
                        },
                    },
                },
                async function () {
                    return { metrics: true };
                }
            );

            f.post(
                '/with-metrics',
                {
                    config: {
                        metrics: {
                            routeId: 'postMetrics',
                        },
                    },
                },
                async function () {
                    return { metrics: true };
                }
            );

            f.get('/no-metrics', async function () {
                return { metrics: false };
            });
        },
        { prefix: 'fastify-prefix-1' }
    );

    app.register(
        async function (f) {
            // Here we re-use the client already instantiated and track only
            // the routes metrics.
            f.register(plugin, {
                client: app.metrics.client,
                routes: {
                    prefix: 'my-prefix-2',
                },
                health: false,
            });
            f.get(
                '/with-metrics',
                {
                    config: {
                        metrics: {
                            routeId: 'getMetrics',
                        },
                    },
                },
                async function () {
                    return { metrics: true };
                }
            );

            f.post(
                '/with-metrics',
                {
                    config: {
                        metrics: {
                            routeId: 'postMetrics',
                        },
                    },
                },
                async function () {
                    return { metrics: true };
                }
            );

            f.get('/no-metrics', async function () {
                return { metrics: false };
            });
        },
        { prefix: 'fastify-prefix-2' }
    );
});

start(app, mock, fastifyPort, udpPort);
