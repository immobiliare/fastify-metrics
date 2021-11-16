import { FastifyPluginCallback, FastifyPluginAsync } from 'fastify';

import Client, { Options } from '@immobiliarelabs/dats';
import { Sampler } from '@dnlup/doc';

export interface MetricsPluginOptions extends Options {
    sampleInterval?: number;
    collect?: {
        timing: boolean;
        hits: boolean;
        errors: boolean;
        health: boolean;
    };
}

export const trapsPluginCallback: FastifyPluginCallback<MetricsPluginOptions>;
export const trapsPluginAsync: FastifyPluginAsync<MetricsPluginOptions>;

export default trapsPluginCallback;

declare module 'fastify' {
    interface FastifyInstance {
        stats: Client;
        doc?: Sampler;
        hrtime2ns: (time: [number, number]) => number;
        hrtime2ms: (time: [number, number]) => number;
        hrtime2s: (time: [number, number]) => number;
    }
}
