'use strict';

const fp = require('fastify-plugin');
const { default: Client } = require('@immobiliarelabs/dats');
const doc = require('@dnlup/doc');
const {
    hrtime2us,
    hrtime2ns,
    hrtime2ms,
    hrtime2s,
} = require('@dnlup/hrtime-utils');
const hooks = require('./lib/hooks');
const staticMode = require('./lib/routes/static');
const dynamicMode = require('./lib/routes/dynamic');
const {
    getRouteId,
    normalizeFastifyPrefix,
    normalizeRoutePrefix,
    STATSD_METHODS,
    isCustomClient,
} = require('./lib/util');
const { kMetricsLabel } = require('./lib/symbols');
const decorateWithMethods = require('./lib/decorate');

function clientMock() {
    const mock = {
        socket: {
            onError: /* istanbul ignore next */ () => {},
        },
    };
    for (const method of STATSD_METHODS) {
        mock[method] = () => {};
    }
    mock.close = (done) => {
        return setImmediate(done);
    };
    return mock;
}

function sendHealthData(
    { eventLoopUtilization, eventLoopDelay, memory, cpu },
    stats
) {
    stats.gauge('process.mem.external', memory.external);
    stats.gauge('process.mem.rss', memory.rss);
    stats.gauge('process.mem.heapUsed', memory.heapUsed);
    stats.gauge('process.mem.heapTotal', memory.heapTotal);
    stats.gauge('process.eventLoopDelay', eventLoopDelay);
    stats.gauge('process.eventLoopUtilization', eventLoopUtilization);
    stats.gauge('process.cpu', cpu);
}

/**
 * Default configuration for metrics collected.
 */
const DEFAULT_CONFIG_OPTIONS = {
    routes: {
        mode: 'static',
        prefix: '',
        /**
         * Response time
         * TODO: rename in responseTime
         */
        timing: true,
        /**
         * Route response size
         */
        responseSize: false,
        /**
         * Route request size
         */
        requestSize: false,
        /**
         * Route hit counter
         */
        hits: true,
        /**
         * Route errors counter
         */
        errors: true,
    },
    /**
     * Health data
     */
    health: true,
};

module.exports = fp(
    async function (fastify, opts) {
        const { client = {}, routes, ...others } = opts;
        // TODO: allow to pass routes: false to disable the routes alltoghether.
        const { routes: defaultRoutes, ...defaultOthers } =
            DEFAULT_CONFIG_OPTIONS;
        const config = {
            routes: {
                ...defaultRoutes,
                ...routes,
            },
            ...defaultOthers,
            ...others,
        };

        for (const key of [
            'timing',
            'responseSize',
            'requestSize',
            'hits',
            'errors',
        ]) {
            if (typeof config.routes[key] !== 'boolean') {
                throw new Error(`"${key}" must be a boolean.`);
            }
        }
        if (
            (typeof config.health !== 'boolean' &&
                typeof config.health !== 'object') ||
            Array.isArray(config.health) ||
            config.health === null
        ) {
            throw new Error(`"health" must be a boolean or an object.`);
        }
        const { prefix, mode } = config.routes;
        if (typeof prefix !== 'string') {
            throw new Error('"prefix" must be a string.');
        }
        if (prefix.startsWith('.') || prefix.endsWith('.')) {
            config.routes.prefix = prefix.replace(/(^\.+|\.+$)/g, '');
        }
        if (mode !== 'static' && mode !== 'dynamic') {
            throw new Error(
                '"mode" must be one of these values: "static", "dynamic".'
            );
        }

        let stats;
        if (isCustomClient(client)) {
            for (const method of STATSD_METHODS) {
                const fn = client[method];
                if (!fn || typeof fn !== 'function')
                    throw new Error(
                        `client does not implement ${method} method.`
                    );
            }
            stats = client;
        } else {
            const onError = (error) => void fastify.log.error(error);
            stats = client.host
                ? new Client({
                      onError,
                      ...client,
                  })
                : clientMock();
        }

        let sampler;
        if (config.health) {
            sampler =
                typeof config.health === 'object' ? doc(config.health) : doc();
            const onSample = function () {
                sendHealthData(
                    {
                        eventLoopUtilization:
                            sampler.eventLoopUtilization.raw.utilization,
                        eventLoopDelay: sampler.eventLoopDelay.computed,
                        memory: sampler.memory,
                        cpu: sampler.cpu.usage,
                    },
                    stats
                );
            };
            sampler.on('sample', onSample);
        }

        await stats.connect();

        const metrics = Object.freeze({
            namespace:
                typeof client.namespace === 'string' ? client.namespace : '',
            routesPrefix: normalizeRoutePrefix(config.routes.prefix),
            fastifyPrefix: normalizeFastifyPrefix(fastify.prefix),
            client: stats,
            sampler,
            hrtime2us,
            hrtime2ns,
            hrtime2ms,
            hrtime2s,
        });
        fastify.decorate('metrics', metrics);

        fastify.addHook('onRoute', (options) => {
            options.config = options.config || {};
            options.config.metrics = options.config.metrics || {};
            options.config.metrics.routeId = getRouteId(options.config);
            options.config.metrics.fastifyPrefix = normalizeFastifyPrefix(
                options.prefix
            );
            options.config.metrics.routesPrefix = metrics.routesPrefix;
            options.config.metrics[kMetricsLabel] = '';
        });
        if (mode === 'dynamic') {
            let getLabel = config.routes.getLabel || dynamicMode.getLabel;
            if (typeof getLabel !== 'function') {
                throw new Error('"getLabel" must be a function.');
            }
            fastify.decorateRequest(kMetricsLabel, '');
            fastify.decorateReply(kMetricsLabel, '');
            fastify.addHook('onRequest', function (request, reply, next) {
                // TODO: skip noId routes here and in hooks.
                const label = getLabel.call(this, request, reply);
                request[kMetricsLabel] = label;
                reply[kMetricsLabel] = label;
                next();
            });
        } else {
            const getLabel = config.routes.getLabel || staticMode.getLabel;
            if (typeof getLabel !== 'function') {
                throw new Error('"getLabel" must be a function.');
            }
            // TODO: skip noId routes here and in hooks.
            fastify.addHook('onRoute', (options) => {
                options.config.metrics[kMetricsLabel] = getLabel(options);
            });
        }

        decorateWithMethods(fastify, mode, stats);

        fastify.addHook('onClose', hooks.onClose);

        if (config.routes.hits) {
            fastify.addHook('onRequest', hooks.onRequest);
        }
        if (config.routes.timing) {
            fastify.addHook('onResponse', hooks.onResponse);
        }
        if (config.routes.errors) {
            fastify.addHook('onError', hooks.onError);
        }
        if (config.routes.requestSize) {
            fastify.addHook('preValidation', hooks.onRequestSize);
        }
        if (config.routes.responseSize) {
            fastify.addHook('onResponse', hooks.onResponseSize);
        }
    },
    {
        name: '@immobiliarelabs/fastify-metrics',
        fastify: '3.x',
    }
);
