import { expectType } from 'tsd';

import Fastify from 'fastify';
import Client from '@immobiliarelabs/dats';
import { Sampler } from '@dnlup/doc';
import plugin from './index';

const fastify = Fastify();

fastify.register(plugin).after((err) => {
    if (err) throw err;
    expectType<(time: [number, number]) => number>(fastify.hrtime2ms);
    expectType<(time: [number, number]) => number>(fastify.hrtime2ms);
    expectType<(time: [number, number]) => number>(fastify.hrtime2ms);
    expectType<Client>(fastify.stats);
    expectType<Sampler | undefined>(fastify.doc);
});
