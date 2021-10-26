import { FastifyPluginCallback, FastifyPluginAsync } from 'fastify';

import Client from '@immobiliarelabs/dats';
import { Options } from '@immobiliarelabs/dats';

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
        hrtime2ns: (time: [number, number]) => number;
        hrtime2ms: (time: [number, number]) => number;
        hrtime2s: (time: [number, number]) => number;
    }
}
