import {
    FastifyInstance,
    FastifyPluginCallback,
    FastifyPluginAsync,
} from 'fastify';
import { TimerifyOptions, PerformanceEntry } from 'perf_hooks';
import Client, { Options } from '@immobiliarelabs/dats';
import { Sampler } from '@dnlup/doc';

export type OnSendHook = (
    this: FastifyInstance,
    name: string,
    value: PerformanceEntry
) => void;

export type MetricsTimerifyOptions = {
    label?: string;
    onSend?: OnSendHook;
    timerifyOptions?: TimerifyOptions;
};

export interface MetricsPluginOptions extends Options {
    sampleInterval?: number;
    collect?: {
        timing: boolean;
        hits: boolean;
        errors: boolean;
        health: boolean;
    };
}

export const MetricsPluginCallback: FastifyPluginCallback<MetricsPluginOptions>;
export const MetricsPluginAsync: FastifyPluginAsync<MetricsPluginOptions>;

export default MetricsPluginCallback;

declare module 'fastify' {
    interface FastifyInstance {
        stats: Client;
        doc?: Sampler;
        hrtime2ns: (time: [number, number]) => number;
        hrtime2us: (time: [number, number]) => number;
        hrtime2ms: (time: [number, number]) => number;
        hrtime2s: (time: [number, number]) => number;
        timerify<T extends (...params: any[]) => any>(
            fn: T,
            options?: MetricsTimerifyOptions
        ): T;
    }
}
