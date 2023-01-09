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
    expectType<(time: [number, number]) => number>(fastify.metrics.hrtime2us);
    expectType<(time: [number, number]) => number>(fastify.metrics.hrtime2ms);
    expectType<(time: [number, number]) => number>(fastify.metrics.hrtime2ms);
    expectType<(time: [number, number]) => number>(fastify.metrics.hrtime2ms);
    expectType<Client>(fastify.metrics.client);
    expectType<Sampler | undefined>(fastify.metrics.sampler);
    expectType<string>(fastify.metrics.fastifyPrefix);
    expectType<string>(fastify.metrics.routesPrefix);

    fastify.get(
        '/options',
        {
            config: {
                metrics: {
                    routeId: 'test',
                },
            },
        },
        () => {}
    );

    fastify.get('/', async function (request, reply) {
        expectType<FastifyContextConfig>(request.routeConfig);
        expectType<{
            routeId: string;
            fastifyPrefix?: string;
            routesPrefix?: string;
        }>(request.routeConfig.metrics);
        expectType<string>(request.routeConfig.metrics.routeId);
        expectType<typeof Client.prototype.timing>(request.sendTimingMetric);
        expectType<typeof Client.prototype.counter>(request.sendCounterMetric);
        expectType<typeof Client.prototype.gauge>(request.sendGaugeMetric);
        expectType<typeof Client.prototype.set>(request.sendSetMetric);
        expectType<() => string>(request.getMetricLabel);

        expectType<typeof Client.prototype.timing>(reply.sendTimingMetric);
        expectType<typeof Client.prototype.counter>(reply.sendCounterMetric);
        expectType<typeof Client.prototype.gauge>(reply.sendGaugeMetric);
        expectType<typeof Client.prototype.set>(reply.sendSetMetric);
        expectType<() => string>(reply.getMetricLabel);
    });
});

expectError(
    getFastify({
        routes: {
            mode: 'nonexistent',
        },
    })
);

expectError(
    getFastify({
        routes: {
            mode: 'static',
            getLabel: () => {},
        },
    })
);

expectError(
    getFastify({
        routes: {
            mode: 'static',
            getLabel: () => {},
        },
    })
);

expectType(
    getFastify({
        routes: {
            mode: 'static',
            getLabel: (options) =>
                `${options.config.metrics.fastifyPrefix}.${options.config.metrics.routesPrefix}.${options.config.metrics.routeId}`,
        },
    })
);

expectType(
    getFastify({
        routes: {
            mode: 'dynamic',
            getLabel: function (request, reply) {
                expectType<FastifyInstance>(this);
                expectType<FastifyRequest>(request);
                expectType<string | undefined>(
                    request.routeConfig.metrics.fastifyPrefix
                );
                expectType<string | undefined>(
                    request.routeConfig.metrics.routesPrefix
                );
                expectType<string>(request.routeConfig.metrics.routeId);
                expectType<FastifyReply>(reply);
                expectType<string | undefined>(
                    reply.request.routeConfig.metrics.fastifyPrefix
                );
                expectType<string | undefined>(
                    reply.request.routeConfig.metrics.routesPrefix
                );
                expectType<string>(reply.request.routeConfig.metrics.routeId);
                return 'label';
            },
        },
    })
);

expectError(
    getFastify({
        client: {
            counter: () => {},
            set: () => {},
            timing: () => {},
            gauge: () => {},
            close: () => {},
            connect: () => {},
        },
    })
);

const client = new Client({ host: 'localhost' });

expectType(getFastify({ client }));
expectType(
    getFastify({
        client: {
            counter: () => {},
            set: () => {},
            timing: () => {},
            gauge: () => {},
            close: () => {},
            connect: () => Promise.resolve(true),
        },
    })
);

expectType(
    getFastify({
        routes: true,
    })
);

expectType(
    getFastify({
        routes: false,
    })
);
