import { FastifyPluginCallback, FastifyPluginAsync } from 'fastify';

import Client, { Options } from '@immobiliarelabs/dats';
import { Sampler } from '@dnlup/doc';

type CustomClient = Pick<
    Client,
    'gauge' | 'counter' | 'timing' | 'set' | 'close' | 'connect'
>;

export interface MetricsPluginOptions extends Options {
    sampleInterval?: number;
    collect?: {
        timing: boolean;
        hits: boolean;
        errors: boolean;
        health: boolean;
    };
    customDatsClient?: CustomClient;
}

export const MetricsPluginCallback: FastifyPluginCallback<MetricsPluginOptions>;
export const MetricsPluginAsync: FastifyPluginAsync<MetricsPluginOptions>;

export default MetricsPluginCallback;

declare module 'fastify' {
    interface FastifyInstance {
        stats: Client;
        doc?: Sampler;
        hrtime2ns: (time: [number, number]) => number;
        hrtime2ms: (time: [number, number]) => number;
        hrtime2s: (time: [number, number]) => number;
    }
}
