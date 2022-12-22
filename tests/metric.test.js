'use strict';

const tap = require('tap');
const { setupRoutes } = require('./helpers/utils');

const routes = [
    {
        url: '/',
        method: ['GET', 'POST'],
        config: { metrics: { routeId: 'rsTest' } },
        handler: () => ({ ok: 1 }),
    },
    {
        url: '/empty',
        method: ['GET', 'POST'],
        config: { metrics: { routeId: 'rsTest' } },
        handler: () => '',
    },
];

tap.test('response_size', async (t) => {
    const app = await setupRoutes(
        {
            client: {
                host: `udp://127.0.0.1:1234`,
            },
            routes: {
                responseSize: true,
                responseTime: false,
                requestSize: false,
                hits: false,
                errors: false,
            },
            health: false,
        },
        routes
    );

    t.teardown(() => app.close());

    await app.inject({
        method: 'GET',
        url: '/',
    });

    t.ok(app.metrics.client.hasSent(/rsTest\.response_size:8\|ms/));

    app.metrics.client.cleanMetrics();

    await app.inject({
        method: 'GET',
        url: '/empty',
    });

    t.notOk(
        app.metrics.client.hasSent(/rsTest\.response_size:\d+(\.\d+)?\|ms/)
    );
});

tap.test('request_size', async (t) => {
    const app = await setupRoutes(
        {
            client: {
                host: `udp://127.0.0.1:123`,
            },
            routes: {
                requestSize: true,
                responseSize: false,
                responseTime: false,
                hits: false,
                errors: false,
            },
            health: false,
        },
        routes
    );

    t.teardown(() => app.close());

    await app.inject({
        method: 'POST',
        url: '/',
        payload: { ok: 1 }, // 8 bytes is the size of the json payload
    });

    t.ok(app.metrics.client.hasSent(/rsTest\.request_size:8\|ms/));

    app.metrics.client.cleanMetrics();

    await app.inject({
        method: 'POST',
        url: '/empty',
    });

    t.notOk(app.metrics.client.hasSent(/rsTest\.request_size:\d+(\.\d+)?\|ms/));
});
