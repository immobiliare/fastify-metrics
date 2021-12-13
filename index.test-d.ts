import { PerformanceEntry } from 'perf_hooks';
import { expectType, expectError } from 'tsd';
import Fastify, { FastifyPluginCallback, FastifyPluginAsync } from 'fastify';
import Client from '@immobiliarelabs/dats';
import { Sampler } from '@dnlup/doc';
import plugin, {
    MetricsPluginCallback,
    MetricsPluginAsync,
    MetricsPluginOptions,
} from './index';

expectType<FastifyPluginCallback<MetricsPluginOptions>>(plugin);
expectType<FastifyPluginCallback<MetricsPluginOptions>>(MetricsPluginCallback);
expectType<FastifyPluginAsync<MetricsPluginOptions>>(MetricsPluginAsync);

const fastify = Fastify();

fastify.register(plugin).after((err) => {
    if (err) throw err;
    expectType<(time: [number, number]) => number>(fastify.hrtime2ns);
    expectType<(time: [number, number]) => number>(fastify.hrtime2us);
    expectType<(time: [number, number]) => number>(fastify.hrtime2ms);
    expectType<(time: [number, number]) => number>(fastify.hrtime2s);
    expectType<Client>(fastify.stats);
    expectType<Sampler | undefined>(fastify.doc);

    // These should work
    const sendPerfEntry = (name: string, value: PerformanceEntry) => {
        console.log(name, value.duration);
    };
    let timerified = fastify.timerify(function test1() {}, { label: 'test1' });
    expectType<() => void>(timerified);
    fastify.timerify(function test2() {}, {
        label: 'test2',
        onSend: sendPerfEntry,
    });
    fastify.timerify(function test3() {}, { label: 'test3' });

    // These should not
    expectError(fastify.timerify());
    expectError(fastify.timerify('test'));
    expectError(fastify.timerify('test', {}));
    expectError(fastify.timerify(function test5() {}, { label: 3 }));
    expectError(
        fastify.timerify(function test6() {}, {
            label: 'test',
            onSend: 'string',
        })
    );
    expectError(
        fastify.timerify(function test6() {}, {
            label: 'test',
            onSend: (label: number, value: number) => {
                console.log(label, value);
            },
        })
    );
});
