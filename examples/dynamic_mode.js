/**
 * In this example we show a possible use case for the dynamic mode of the routes label generation.
 * A custom field `x-type` in the request headers is used to compose the label.
 *
 * Launch the example
 * $ node ./examples/dynamic_mode.js
 *
 * Then make a request to the `/with-metrics` enpoint to see the request stats.
 *
 * $ curl localhost:3000/with-metrics
 * curl -H 'x-type: custom' localhost:3000/with-metrics
 * $ curl -X POST -d '{ "test": true }' -H 'content-type: application/json' localhost:3000/with-metrics
 * $ curl -X POST -d '{ "test": true }' -H 'content-type: application/json' -H 'x-type: custom' localhost:3000/with-metrics
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
        namespace: 'dynamic_mode_test',
    },
    health: false,
    routes: {
        mode: 'dynamic',
        getLabel(request) {
            const { metrics } = request.routeConfig;
            const { routeId, fastifyPrefix, routesPrefix } = metrics;
            const type = request.headers['x-type'] || 'default';
            return `${fastifyPrefix ? fastifyPrefix + '.' : ''}${
                routesPrefix ? routesPrefix + '.' : ''
            }${type}.${routeId}`;
        },
    },
});

app.get(
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

app.post(
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

app.get('/no-metrics', async function () {
    return { metrics: false };
});

start(app, mock, fastifyPort, udpPort);
