import {
    FastifyPluginCallback,
    FastifyPluginAsync,
    FastifyRequest,
    FastifyReply,
    FastifyInstance,
    RouteOptions,
} from 'fastify';

import Client, { Options } from '@immobiliarelabs/dats';
import { Sampler } from '@dnlup/doc';

type CustomClient = Pick<
    Client,
    'gauge' | 'counter' | 'timing' | 'set' | 'close' | 'connect'
>;

type GetDynamicRouteLabel = (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => string;
type GetStaticRouteLabel = (
    prefix: string,
    options: RouteOptions & { routePath: string; path: string; prefix: string }
) => string;

type CommonRouteOptions = {
    prefix?: string;
    timing?: boolean;
    hits?: boolean;
    errors?: boolean;
};

type DynamicMode = {
    mode?: 'dynamic';
    getLabel?: GetDynamicRouteLabel;
} & CommonRouteOptions;

type StaticMode = {
    mode?: 'static';
    getLabel?: GetStaticRouteLabel;
} & CommonRouteOptions;

type RoutesOptions = StaticMode | DynamicMode;

export interface MetricsPluginOptions extends Options {
    sampleInterval?: number;
    collect?: {
        routes?: RoutesOptions;
        health?: boolean;
    };
    customDatsClient?: CustomClient;
}

export const MetricsPluginCallback: FastifyPluginCallback<MetricsPluginOptions>;
export const MetricsPluginAsync: FastifyPluginAsync<MetricsPluginOptions>;

export default MetricsPluginCallback;
declare module 'fastify' {
    interface FastifyInstance {
        metricsRoutesPrefix: string;
        metricsClient: Client;
        doc?: Sampler;
        hrtime2ns: (time: [number, number]) => number;
        hrtime2ms: (time: [number, number]) => number;
        hrtime2s: (time: [number, number]) => number;
    }

    interface FastifyRequest {
        metricsLabel?: string;
        sendTimingMetric: typeof Client.prototype.timing;
        sendCounterMetric: typeof Client.prototype.counter;
        sendGaugeMetric: (name: string, value: number) => void;
        sendSetMetric: (name: string, value: number) => void;
    }

    interface FastifyReply {
        metricsLabel?: string;
        sendTimingMetric: typeof Client.prototype.timing;
        sendCounterMetric: typeof Client.prototype.counter;
        sendGaugeMetric: (name: string, value: number) => void;
        sendSetMetric: (name: string, value: number) => void;
    }
}
