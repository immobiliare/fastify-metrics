'use strict';

const tap = require('tap');
const fastify = require('fastify');
const { default: Dats } = require('@immobiliarelabs/dats');
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

tap.test('valid options', async (t) => {
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

tap.test('invalid options', async (t) => {
    const configs = [
        {
            value: {
                routes: {
                    responseTime: 'true',
                },
            },
            message: '"responseTime" must be a boolean.',
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
            message: '"mode" must be one of these values: "static", "dynamic".',
        },
        {
            value: {
                routes: {
                    mode: null,
                },
            },
            message: '"mode" must be one of these values: "static", "dynamic".',
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

tap.test('should cleanup a custom prefix', async (t) => {
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

tap.test('should allow custom dats client', async (t) => {
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

    t.resolves(setup({ client: new Dats({ host: 'udp://localhost:7000' }) }));
});

tap.test(
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
