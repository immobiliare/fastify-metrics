import {
    FastifyPluginCallback,
    FastifyPluginAsync,
    FastifyRequest,
    FastifyReply,
    FastifyInstance,
    RouteOptions,
} from 'fastify';

import Client, { Options as ClientOptions } from '@immobiliarelabs/dats';
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
    options: RouteOptions & {
        routePath: string;
        path: string;
        prefix: string;
        config: {
            metrics: {
                routeId: string;
                fastifyPrefix: string;
                routesPrefix: string;
            };
        };
    }
) => string;

type CommonRouteOptions = {
    prefix?: string;
    timing?: boolean;
    hits?: boolean;
    requestSize?: boolean;
    responseSize?: boolean;
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

type SamplerOptions = {
    sampleInterval?: number;
    eventLoopOptions?: {
        resolution: number;
    };
};

type MetricsInstanceDecorator = {
    namespace: string;
    /** Normalized fastify prefix */
    fastifyPrefix: string;
    /** Normalized routes prefix */
    routesPrefix: string;
    client: Client;
    sampler?: Sampler;
    hrtime2us: (time: [number, number]) => number;
    hrtime2ns: (time: [number, number]) => number;
    hrtime2ms: (time: [number, number]) => number;
    hrtime2s: (time: [number, number]) => number;
};

export interface MetricsPluginOptions {
    client?: ClientOptions | CustomClient;
    routes?: RoutesOptions;
    health?: boolean | SamplerOptions;
}

export const MetricsPluginCallback: FastifyPluginCallback<MetricsPluginOptions>;
export const MetricsPluginAsync: FastifyPluginAsync<MetricsPluginOptions>;

export default MetricsPluginCallback;
declare module 'fastify' {
    interface FastifyInstance {
        metrics: MetricsInstanceDecorator;
    }

    interface FastifyRequest {
        sendTimingMetric: typeof Client.prototype.timing;
        sendCounterMetric: typeof Client.prototype.counter;
        sendGaugeMetric: typeof Client.prototype.gauge;
        sendSetMetric: typeof Client.prototype.set;
        getMetricLabel: () => string;
    }

    interface FastifyReply {
        sendTimingMetric: typeof Client.prototype.timing;
        sendCounterMetric: typeof Client.prototype.counter;
        sendGaugeMetric: typeof Client.prototype.gauge;
        sendSetMetric: typeof Client.prototype.set;
        getMetricLabel: () => string;
    }

    interface FastifyContextConfig {
        metrics: {
            /** The id for this route that will be used for the label */
            routeId: string;
            /** Normalized fastify prefix for this route */
            fastifyPrefix: string;
            /** Normalized prefix of the routes */
            routesPrefix: string;
        };
    }
}
