import { expectType, expectError } from 'tsd';

import Fastify, { FastifyPluginCallback, FastifyPluginAsync } from 'fastify';
import Client from '@immobiliarelabs/dats';
import { Sampler } from '@dnlup/doc';
import plugin, {
    MetricsPluginCallback,
    MetricsPluginAsync,
    MetricsPluginOptions,
} from './index';

function getFastify(options?: MetricsPluginOptions) {
    const instance = Fastify();
    return instance.register(plugin, options);
}

expectType<FastifyPluginCallback<MetricsPluginOptions>>(plugin);
expectType<FastifyPluginCallback<MetricsPluginOptions>>(MetricsPluginCallback);
expectType<FastifyPluginAsync<MetricsPluginOptions>>(MetricsPluginAsync);

let fastify = getFastify();

fastify.after((err) => {
    if (err) throw err;
    expectType<(time: [number, number]) => number>(fastify.hrtime2ms);
    expectType<(time: [number, number]) => number>(fastify.hrtime2ms);
    expectType<(time: [number, number]) => number>(fastify.hrtime2ms);
    expectType<Client>(fastify.stats);
    expectType<Sampler | undefined>(fastify.doc);
});

expectError(
    getFastify({
        customDatsClient: {
            counter: () => {},
            set: () => {},
            timing: () => {},
            gauge: () => {},
            close: () => {},
            connect: () => {},
        },
    })
);

const customDatsClient = new Client({ host: 'localhost' });

expectType(getFastify({ customDatsClient }));
expectType(
    getFastify({
        customDatsClient: {
            counter: () => {},
            set: () => {},
            timing: () => {},
            gauge: () => {},
            close: () => {},
            connect: () => Promise.resolve(true),
        },
    })
);
