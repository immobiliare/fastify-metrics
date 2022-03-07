'use strict';

const tap = require('tap');
const { checkMetricsMock } = require('./helpers/tester');
const { defaultSetup: setup } = require('./helpers/utils');

tap.test('default metrics', async (t) => {
    const app = await setup(
        {
            client: {
                namespace: 'dynamic_routes_test',
            },
            routes: {
                mode: 'dynamic',
            },
        },
        undefined,
        t,
        '/dynamic/test'
    );
    t.teardown(async () => {
        return app.close();
    });
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
    checkMetricsMock(
        [
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
        ],
        app,
        t
    );
});

tap.test('custom prefix', async (t) => {
    const app = await setup(
        {
            client: {
                namespace: 'dynamic_routes_custom_prefix_test',
            },
            routes: {
                prefix: 'prefix',
                mode: 'dynamic',
            },
        },
        undefined,
        t,
        '/dynamic/test'
    );
    t.teardown(async () => {
        return app.close();
    });
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
    checkMetricsMock(
        [
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
        ],
        app,
        t
    );
});

tap.test('custom getLabel', async (t) => {
    const app = await setup(
        {
            client: {
                namespace: 'dynamic_routes_custom_getlabel_test',
            },
            routes: {
                getLabel: function (request, reply) {
                    t.ok(typeof this.prefix === 'string');
                    t.ok(typeof this.metrics.routesPrefix === 'string');
                    for (const r of [request, reply]) {
                        t.ok(typeof r.context.config.metrics === 'object');
                        t.equal(
                            'string',
                            typeof r.context.config.metrics.routeId
                        );
                        t.equal(
                            'string',
                            typeof r.context.config.metrics.fastifyPrefix
                        );
                        t.equal(
                            'string',
                            typeof r.context.config.metrics.routesPrefix
                        );
                    }
                    return 'customLabel';
                },
                mode: 'dynamic',
            },
        },
        (req, res) => {
            t.equal(req.getMetricLabel(), 'customLabel');
            t.equal(res.getMetricLabel(), 'customLabel');
        },
        t,
        '/dynamic/test'
    );
    t.teardown(async () => {
        return app.close();
    });
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
    checkMetricsMock(
        [
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
        ],
        app,
        t
    );
});

tap.test('custom getLabel and custom prefix', async (t) => {
    const app = await setup(
        {
            client: {
                namespace: 'dynamic_routes_custom_prefix_getlabel_test',
            },
            routes: {
                prefix: 'prefix',
                getLabel: function (request, reply) {
                    t.ok(typeof this.prefix === 'string');
                    t.ok(this.metrics.routesPrefix === 'prefix');
                    for (const r of [request, reply]) {
                        t.ok(typeof r.context.config.metrics === 'object');
                        t.equal(
                            'string',
                            typeof r.context.config.metrics.routeId
                        );
                        t.equal(
                            'string',
                            typeof r.context.config.metrics.fastifyPrefix
                        );
                        t.equal(
                            'string',
                            typeof r.context.config.metrics.routesPrefix
                        );
                    }
                    return 'customLabel';
                },
                mode: 'dynamic',
            },
        },
        (req, res) => {
            t.equal(req.getMetricLabel(), 'customLabel');
            t.equal(res.getMetricLabel(), 'customLabel');
        },
        t,
        '/dynamic/test'
    );
    t.teardown(async () => {
        return app.close();
    });
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
    checkMetricsMock(
        [
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
        ],
        app,
        t
    );

    tap.test('404 test', async (t) => {
        const server = await setup(
            {
                client: {
                    namespace: '404_dynamic_mode_errors',
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
