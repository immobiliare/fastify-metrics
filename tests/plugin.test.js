'use strict';

const test = require('ava');
const fastify = require('fastify');
const sinon = require('sinon');
const { hrtime2ms } = require('@dnlup/hrtime-utils');
const { StatsdMock } = require('./helpers/statsd');
const { gte16 } = require('../lib/utils');
const plugin = require('../');

const PLUGINS_METHODS = ['counter', 'timing', 'gauge', 'set'];
const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

async function setup(options) {
    const server = fastify();
    server.register(plugin, options);
    server.get('/', (request, reply) => {
        reply.send('ok');
    });
    server.get('/oops', async () => {
        throw new Error('Oops');
    });
    await server.ready();
    return server;
}

async function configMacro(t, options) {
    const server = await setup(options);
    t.true(server.hasDecorator('stats'));
    t.true(server.hasDecorator('doc'));
    t.true(server.hasDecorator('hrtime2ns'));
    t.true(server.hasDecorator('hrtime2us'));
    t.true(server.hasDecorator('hrtime2ms'));
    t.true(server.hasDecorator('hrtime2s'));
    for (const method of PLUGINS_METHODS) {
        t.is('function', typeof server.stats[method]);
    }
}

test.beforeEach(async (t) => {
    t.context.statsd = new StatsdMock();
    t.context.address = await t.context.statsd.start();
});

test.afterEach(async (t) => {
    await t.context.statsd.stop();
});

test.serial('configuration without options', configMacro);

test.serial('configuration with statsd host', configMacro, {
    host: 'udp://172.0.0.100:123',
    namespace: 'ns',
});

test.serial('configuration with custom sampleInterval', configMacro, {
    sampleInterval: 2000,
});

test.serial.todo('should not decorate doc if health is not enabled');

test.serial('sending process health metrics', async (t) => {
    const start = process.hrtime();
    await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        namespace: 'ns',
        sampleInterval: 2000,
    });
    await new Promise((resolve, reject) => {
        let elapsed;
        const regexes = [
            /ns\.process\.mem\.external:\d+(\.\d+)?\|g/,
            /ns\.process\.mem\.rss:\d+(\.\d+)?|g/,
            /ns\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
            /ns\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
            /ns\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
            /ns\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
            /ns\.process\.cpu:\d+(\.\d+)?\|g/,
        ];
        let cursor = 0;
        t.context.statsd.on('metric', (buffer) => {
            try {
                if (!elapsed) {
                    elapsed = process.hrtime(start);
                    const ms = hrtime2ms(elapsed);
                    t.true(ms >= 2000 && ms <= 2100);
                }
                const metric = buffer.toString();
                t.regex(metric, regexes[cursor], `${metric} is not listed`);
                cursor = cursor + 1;
                if (cursor >= regexes.length) {
                    resolve();
                }
            } catch (error) {
                reject(error);
            }
        });
    });
});

test.serial('sending requests metrics', async (t) => {
    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        namespace: 'ns',
        sampleInterval: 2000,
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
            let cursor = 0;
            t.context.statsd.on('metric', (buffer) => {
                const metric = buffer.toString();
                t.regex(metric, regexes[cursor], `${metric} is not listed`);
                cursor = cursor + 1;
                if (cursor >= regexes.length) {
                    resolve();
                }
            });
        }),
    ]);
});

test.serial('sending requests errors metrics', async (t) => {
    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        namespace: 'ns',
        sampleInterval: 2000,
    });
    await Promise.all([
        server.inject({
            method: 'GET',
            url: '/oops',
        }),
        new Promise((resolve) => {
            const regexes = [
                /ns\.api\.noId\.requests:1\|c/,
                /ns\.api\.noId\.errors\.500:1\|c/,
                /ns\.api\.noId.response_time:\d+(\.\d+)?\|ms/,
            ];
            let cursor = 0;
            t.context.statsd.on('metric', (buffer) => {
                const metric = buffer.toString();
                t.regex(metric, regexes[cursor], `${metric} is not listed`);
                cursor = cursor + 1;
                if (cursor >= regexes.length) {
                    resolve();
                }
            });
        }),
    ]);
});

test.serial('close hook with mock', async (t) => {
    const server = await setup();
    await server.close();
    t.pass();
});

test.serial('close hook', async (t) => {
    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        namespace: 'ns',
    });
    await server.close();
    t.pass();
});

test.serial('should log statsd client errors', async (t) => {
    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        namespace: 'ns',
    });
    const spy = sinon.spy(server.log, 'error');
    server.stats.socket.onError(new Error('test'));
    t.is('test', spy.getCall(0).firstArg.message);
});

test.serial('should allow disabling timings', async (t) => {
    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        namespace: 'ns',
        collect: {
            timing: false,
        },
    });
    await Promise.all([
        server.inject({
            method: 'GET',
            url: '/',
        }),
        new Promise((resolve) => {
            const regexes = [
                /ns\.api\.noId\.requests:1\|c/,
                /ns\.process\.mem\.external:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                /ns\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                /ns\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                /ns\.process\.cpu:\d+(\.\d+)?\|g/,
            ];
            const disabled = /ns\.api\.noId:\d+(\.\d+)?\|ms/;
            let cursor = 0;
            t.context.statsd.on('metric', (buffer) => {
                const metric = buffer.toString();
                t.regex(metric, regexes[cursor], `${metric} is not listed`);
                t.is(
                    false,
                    disabled.test(metric),
                    `${metric} should be disabled`
                );
                cursor = cursor + 1;
                if (cursor >= regexes.length) {
                    resolve();
                }
            });
        }),
    ]);
    t.pass();
});

test.serial('should allow disabling hits', async (t) => {
    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        namespace: 'ns',
        collect: {
            hits: false,
        },
    });
    await Promise.all([
        server.inject({
            method: 'GET',
            url: '/',
        }),
        new Promise((resolve) => {
            const regexes = [
                /ns\.api\.noId\.response_time:\d+(\.\d+)?\|ms/,
                /ns\.process\.mem\.external:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                /ns\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                /ns\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                /ns\.process\.cpu:\d+(\.\d+)?\|g/,
            ];
            const disabled = /ns\.api\.requests\.noId:1\|c/;
            let cursor = 0;
            t.context.statsd.on('metric', (buffer) => {
                const metric = buffer.toString();
                t.regex(metric, regexes[cursor], `${metric} is not listed`);
                t.is(
                    false,
                    disabled.test(metric),
                    `${metric} should be disabled`
                );
                cursor = cursor + 1;
                if (cursor >= regexes.length) {
                    resolve();
                }
            });
        }),
    ]);
    t.pass();
});

test.serial('should allow disabling errors', async (t) => {
    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        namespace: 'ns',
        collect: {
            errors: false,
        },
    });
    await Promise.all([
        server.inject({
            method: 'GET',
            url: '/oops',
        }),
        new Promise((resolve) => {
            const regexes = [
                /ns\.api\.noId\.requests:1\|c/,
                /ns\.api\.noId\.response_time:\d+(\.\d+)?\|ms/,
                /ns\.process\.mem\.external:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                /ns\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                /ns\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                /ns\.process\.cpu:\d+(\.\d+)?\|g/,
            ];
            const disabled = /ns\.api\.errors\.noId\.500:1\|c/;
            let cursor = 0;
            t.context.statsd.on('metric', (buffer) => {
                const metric = buffer.toString();
                t.regex(metric, regexes[cursor], `${metric} is not listed`);
                t.is(
                    false,
                    disabled.test(metric),
                    `${metric} should be disabled`
                );
                cursor = cursor + 1;
                if (cursor >= regexes.length) {
                    resolve();
                }
            });
        }),
    ]);
    t.pass();
});

test.serial('should allow disabling health', async (t) => {
    const sampleInterval = 10;
    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        sampleInterval,
        namespace: 'ns',
        collect: {
            health: false,
        },
    });
    await Promise.all([
        server.inject({
            method: 'GET',
            url: '/',
        }),
        new Promise((resolve) => {
            const regexes = [
                /ns\.api.noId\.requests:1\|c/,
                /ns\.api\.noId.response_time:\d+(\.\d+)?\|ms/,
            ];
            const disabled = [
                /ns\.process\.mem\.external:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                /ns\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                /ns\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                /ns\.process\.cpu:\d+(\.\d+)?\|g/,
            ];

            let cursor = 0;
            t.context.statsd.on('metric', (buffer) => {
                const metric = buffer.toString();
                if (regexes[cursor]) {
                    t.regex(metric, regexes[cursor], `${metric} is not listed`);
                }
                for (const regex of disabled) {
                    t.is(
                        false,
                        regex.test(metric),
                        `${metric} should be disabled`
                    );
                }
                cursor = cursor + 1;
                if (cursor >= regexes.length) {
                    setTimeout(resolve, sampleInterval);
                }
            });
        }),
    ]);
    t.pass();
});

test.serial('should allow disabling all default metrics', async (t) => {
    const sampleInterval = 10;
    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        sampleInterval,
        namespace: 'ns',
        collect: {
            timing: false,
            hits: false,
            errors: false,
            health: false,
        },
    });
    await Promise.all([
        server.inject({
            method: 'GET',
            url: '/',
        }),
        new Promise((resolve) => {
            const metrics = [1.2, 2.1, 1.5];
            const disabled = [
                /ns\.api\.requests\.noId:1\|c/,
                /ns\.api\.noId:\d+(\.\d+)?\|ms/,
                /ns\.process\.mem\.external:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.rss:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.heapUsed:\d+(\.\d+)?\|g/,
                /ns\.process\.mem\.heapTotal:\d+(\.\d+)?\|g/,
                /ns\.process\.eventLoopDelay:\d+(\.\d+)?\|g/,
                /ns\.process\.eventLoopUtilization:\d+(\.\d+)?\|g/,
                /ns\.process\.cpu:\d+(\.\d+)?\|g/,
            ];
            for (const metric of metrics) {
                server.stats.timing('some_time', metric);
            }
            let cursor = 0;
            t.context.statsd.on('metric', (buffer) => {
                const metric = buffer.toString();
                if (metrics[cursor]) {
                    t.is(metric, `ns.some_time:${metrics[cursor]}|ms`);
                }
                for (const regex of disabled) {
                    t.is(
                        false,
                        regex.test(metric),
                        `${metric} should be disabled`
                    );
                }
                cursor = cursor + 1;
                if (cursor >= metrics.length) {
                    setTimeout(resolve, sampleInterval);
                }
            });
        }),
    ]);
    t.pass();
});

test.serial(
    'configuration collect setting should allow only boolean values',
    async (t) => {
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
            const error = await t.throwsAsync(
                async () => {
                    await setup({
                        host: `udp://127.0.0.1:${t.context.address.port}`,
                        namespace: 'ns',
                        collect: config.value,
                    });
                },
                { instanceOf: Error }
            );
            t.is(error.message, config.message);
        }
    }
);

test.serial('timerify bad args', async (t) => {
    if (!gte16) {
        t.log('skipping test');
        return t.pass();
    }
    const list = [
        {
            args: [],
            message: 'You have to pass a function to timerify',
        },
        {
            args: [() => {}, { label: 3 }],
            message:
                'You have to pass a string to label the timerified function metric',
        },
        {
            args: [() => {}, { onSend: '' }],
            message: 'You have to pass a function to the custom onSend hook',
        },
    ];
    for (const opts of list) {
        const server = await setup({
            host: `udp://127.0.0.1:${t.context.address.port}`,
            namespace: 'ns',
            collect: {
                timing: false,
                hits: false,
                errors: false,
                health: false,
            },
        });
        const error = t.throws(() => server.timerify(...opts.args), {
            instanceOf: Error,
        });
        t.is(opts.message, error.message, error.stack);
    }
});

test.serial('timerify', async (t) => {
    if (!gte16) {
        t.log('skipping test');
        return t.pass();
    }
    const { clear } = require('../lib/timerifyWrap');
    t.teardown(clear);
    const func = async () => {
        await sleep(100);
    };
    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        namespace: 'ns',
        collect: {
            timing: false,
            hits: false,
            errors: false,
            health: false,
        },
    });

    t.true(server.hasDecorator('timerify'));
    const timerified = server.timerify(func, {
        label: 'func',
    });
    await Promise.all([
        new Promise((resolve) => {
            t.context.statsd.on('metric', (buffer) => {
                t.true(/ns\.func:\d+(\.\d+)?\|ms/.test(buffer.toString()));
                resolve();
            });
        }),
        timerified(),
    ]);
    const sameFunc = () => {};
    const func1 = server.timerify(sameFunc);
    const func2 = server.timerify(sameFunc);
    t.is(func1, func2);
});

test.serial('timerify custom onSend', async (t) => {
    if (!gte16) {
        t.log('skipping test');
        return t.pass();
    }
    const { clear } = require('../lib/timerifyWrap');
    t.teardown(clear);
    const { PerformanceEntry } = require('perf_hooks');

    const onSend = sinon.spy();
    const asyncFunc1 = async () => {
        await sleep(100);
    };
    const asyncFunc2 = async () => {
        await sleep(200);
    };
    const syncFunc = () => {};

    const server = await setup({
        host: `udp://127.0.0.1:${t.context.address.port}`,
        namespace: 'ns',
        collect: {
            timing: false,
            hits: false,
            errors: false,
            health: false,
        },
    });
    const asyncTimerified1 = server.timerify(asyncFunc1, {
        label: 'asyncFunc1',
        onSend,
    });
    const asyncTimerified2 = server.timerify(asyncFunc2, {
        label: 'asyncFunc2',
        onSend,
    });
    const syncTimerified = server.timerify(syncFunc, {
        label: 'syncFunc',
        onSend,
    });
    const arrowFuncTimerified = server.timerify(() => {}, {
        label: 'arrow',
        onSend,
    });
    const anonFuncTimerified = server.timerify(function () {}, {
        label: 'anon',
    });
    const asyncJobs = Promise.all([asyncTimerified2(), asyncTimerified1()]);

    syncTimerified();
    // All the anonymous functions will conflict with each other.
    arrowFuncTimerified();
    anonFuncTimerified();
    await asyncJobs;

    // Wait for all the callbacks of the perf observer to be fired.
    await sleep(100);

    t.is(3, onSend.callCount);
    t.is('syncFunc', onSend.firstCall.firstArg);
    t.true(onSend.firstCall.lastArg instanceof PerformanceEntry);
    t.is('asyncFunc1', onSend.secondCall.firstArg);
    t.true(onSend.secondCall.lastArg instanceof PerformanceEntry);
    t.is('asyncFunc2', onSend.lastCall.firstArg);
    t.true(onSend.lastCall.lastArg instanceof PerformanceEntry);
});

test.todo('timerify cleanup');
