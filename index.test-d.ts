import { expectType } from 'tsd';

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
    expectType<(time: [number, number]) => number>(fastify.hrtime2ms);
    expectType<(time: [number, number]) => number>(fastify.hrtime2ms);
    expectType<(time: [number, number]) => number>(fastify.hrtime2ms);
    expectType<Client>(fastify.stats);
    expectType<Sampler | undefined>(fastify.doc);
});
