'use strict';

const tap = require('tap');
const { checkMetricsMock } = require('./helpers/tester');
const { defaultSetup: setup } = require('./helpers/utils');

tap.test('default metrics', async (t) => {
    const app = await setup(
        {
            client: {
                namespace: 'static_routes_test',
            },
            routes: {
                mode: 'static',
            },
        },
        undefined,
        t,
        '/static/test'
    );
    t.teardown(async () => {
        return app.close();
    });

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

    checkMetricsMock(
        [
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
        ],
        app,
        t
    );
});

tap.test('custom prefix', async (t) => {
    const app = await setup(
        {
            client: {
                namespace: 'static_routes_custom_prefix_test',
            },
            routes: {
                prefix: 'prefix',

                mode: 'static',
            },
        },
        undefined,
        t,
        '/static/test'
    );
    t.teardown(async () => {
        return app.close();
    });
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
    checkMetricsMock(
        [
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
        ],
        app,
        t
    );
});

tap.test('custom getLabel', async (t) => {
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
                    t.ok(options.config.metrics.routesPrefix === '');
                    t.equal('string', typeof options.config.metrics.routeId);
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
                mode: 'static',
            },
        },
        (req, res) => {
            t.equal(req.getMetricLabel(), 'customLabel');
            t.equal(res.getMetricLabel(), 'customLabel');
        },
        t,
        '/static/test'
    );
    t.teardown(async () => {
        return app.close();
    });
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
    checkMetricsMock(
        [
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
        ],
        app,
        t
    );
});

tap.test('custom getLabel and custom prefix', async (t) => {
    const app = await setup(
        {
            client: {
                namespace: 'static_routes_custom_prefix_getlabel_test',
            },
            routes: {
                prefix: 'prefix',
                getLabel: function (options) {
                    t.ok(typeof options.prefix === 'string');
                    t.ok(options.config);
                    t.ok(options.config.metrics);
                    t.ok(options.config.metrics.routesPrefix === 'prefix');
                    t.equal('string', typeof options.config.metrics.routeId);
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
                mode: 'static',
            },
        },
        (req, res) => {
            t.equal(req.getMetricLabel(), 'customLabel');
            t.equal(res.getMetricLabel(), 'customLabel');
        },
        t,
        '/static/test'
    );
    t.teardown(async () => app.close());
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
    checkMetricsMock(
        [
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
        ],
        app,
        t
    );
    tap.test('404 test', async (t) => {
        const server = await setup(
            {
                client: {
                    namespace: 'static_mode_404_errors',
                },
                health: false,
            },
            undefined,
            t
        );
        t.teardown(async () => {
            return server.close();
        });
        const response = await server.inject({
            method: 'GET',
            url: '/not-existing',
        });
        t.equal(404, response.statusCode);
    });
});
