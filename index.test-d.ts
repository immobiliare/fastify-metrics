import { expectType, expectError } from 'tsd';

import Fastify, {
    FastifyPluginCallback,
    FastifyPluginAsync,
    FastifyRequest,
    FastifyReply,
    FastifyInstance,
    FastifyContextConfig,
} from 'fastify';
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
    expectType<Client>(fastify.metricsClient);
    expectType<Sampler | undefined>(fastify.doc);
    expectType<string>(fastify.metricsRoutesPrefix);

    fastify.get('/', async function (request, reply) {
        expectType<FastifyContextConfig>(request.context.config);
        expectType<{
            routeId: string;
            fastifyPrefix: string;
            routesPrefix: string;
        }>(request.context.config.metrics);
        expectType<string>(request.context.config.metrics.routeId);
        expectType<typeof Client.prototype.timing>(request.sendTimingMetric);
        expectType<typeof Client.prototype.counter>(request.sendCounterMetric);
        expectType<typeof Client.prototype.gauge>(request.sendGaugeMetric);
        expectType<typeof Client.prototype.set>(request.sendSetMetric);

        expectType<typeof Client.prototype.timing>(reply.sendTimingMetric);
        expectType<typeof Client.prototype.counter>(reply.sendCounterMetric);
        expectType<typeof Client.prototype.gauge>(reply.sendGaugeMetric);
        expectType<typeof Client.prototype.set>(reply.sendSetMetric);
    });
});

expectError(
    getFastify({
        collect: {
            routes: {
                mode: 'nonexistent',
            },
        },
    })
);

expectError(
    getFastify({
        collect: {
            routes: {
                mode: 'static',
                getLabel: () => {},
            },
        },
    })
);

expectError(
    getFastify({
        collect: {
            routes: {
                mode: 'static',
                getLabel: () => {},
            },
        },
    })
);

expectType(
    getFastify({
        collect: {
            routes: {
                mode: 'static',
                getLabel: (options) =>
                    `${options.config.metrics.fastifyPrefix}.${options.config.metrics.routesPrefix}.${options.config.metrics.routeId}`,
            },
        },
    })
);

expectType(
    getFastify({
        collect: {
            routes: {
                mode: 'dynamic',
                getLabel: function (request, reply) {
                    expectType<FastifyInstance>(this);
                    expectType<FastifyRequest>(request);
                    expectType<string>(
                        request.context.config.metrics.fastifyPrefix
                    );
                    expectType<string>(
                        request.context.config.metrics.routesPrefix
                    );
                    expectType<string>(request.context.config.metrics.routeId);
                    expectType<FastifyReply>(reply);
                    expectType<string>(
                        reply.context.config.metrics.fastifyPrefix
                    );
                    expectType<string>(
                        reply.context.config.metrics.routesPrefix
                    );
                    expectType<string>(reply.context.config.metrics.routeId);
                    return 'label';
                },
            },
        },
    })
);

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
