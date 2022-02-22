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
} = require('./lib/util');
const { kMetricsLabel } = require('./lib/symbols');

const STATSD_METHODS = [
    'counter',
    'timing',
    'gauge',
    'set',
    'close',
    'connect',
];

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
const DEFAULT_COLLECT_OPTIONS = {
    routes: {
        mode: 'static',
        prefix: '',
        /**
         * Response time
         * TODO: rename in responseTime
         */
        timing: true,
        // TODO: add responseSize
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
    async function (
        fastify,
        {
            host,
            namespace,
            bufferSize,
            bufferFlushTimeout,
            sampleInterval,
            udpDnsCache,
            udpDnsCacheTTL,
            collect = {},
            customDatsClient = null,
            onError = (error) => void fastify.log.error(error),
        }
    ) {
        // TODO: allow to pass routes: false to disable the routes alltoghether.
        const { routes, ...others } = collect;
        const { routes: defaultRoutes, ...defaultOthers } =
            DEFAULT_COLLECT_OPTIONS;
        const metricsConfig = {
            routes: {
                ...defaultRoutes,
                ...routes,
            },
            ...defaultOthers,
            ...others,
        };

        for (const key of ['timing', 'hits', 'errors']) {
            if (typeof metricsConfig.routes[key] !== 'boolean') {
                throw new Error(`"${key}" must be a boolean.`);
            }
        }
        if (typeof metricsConfig.health !== 'boolean') {
            throw new Error(`"health" must be a boolean.`);
        }
        const { prefix, mode } = metricsConfig.routes;
        if (typeof prefix !== 'string') {
            throw new Error('"prefix" must be a string.');
        }
        if (prefix.startsWith('.') || prefix.endsWith('.')) {
            metricsConfig.routes.prefix = prefix.replace(/(^\.+|\.+$)/g, '');
        }
        if (mode !== 'static' && mode !== 'dynamic') {
            throw new Error(
                '"mode" must be one of these values: "static", "dynamic".'
            );
        }

        let stats;

        if (customDatsClient) {
            for (const method of STATSD_METHODS) {
                const fn = customDatsClient[method];
                if (!fn || typeof fn !== 'function')
                    throw new Error(
                        `customDatsClient does not implement ${method} method.`
                    );
            }
            stats = customDatsClient;
        } else {
            stats = host
                ? new Client({
                      host,
                      namespace,
                      bufferSize,
                      bufferFlushTimeout,
                      udpDnsCache,
                      udpDnsCacheTTL,
                      onError: onError,
                  })
                : clientMock();
        }
        let sampler;
        if (metricsConfig.health) {
            sampler = doc({ sampleInterval });
            fastify.decorate('doc', sampler);
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
            namespace: typeof namespace === 'string' ? namespace : '',
            routesPrefix: normalizeRoutePrefix(metricsConfig.routes.prefix),
            fastifyPrefix: normalizeFastifyPrefix(fastify.prefix),
            client: stats,
            sampler,
            hrtime2us,
            hrtime2ns,
            hrtime2ms,
            hrtime2s,
        });
        fastify.decorate('metrics', metrics);

        if (
            metricsConfig.routes.timing ||
            metricsConfig.routes.errors ||
            metricsConfig.routes.hits
        ) {
            fastify.addHook('onRoute', (options) => {
                // TODO: check for duplicates when registering routes
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
                let getLabel =
                    metricsConfig.routes.getLabel || dynamicMode.getLabel;
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
                const getLabel =
                    metricsConfig.routes.getLabel || staticMode.getLabel;
                if (typeof getLabel !== 'function') {
                    throw new Error('"getLabel" must be a function.');
                }
                // TODO: skip noId routes here and in hooks.
                fastify.addHook('onRoute', (options) => {
                    options.config.metrics[kMetricsLabel] = getLabel(options);
                });
            }
        }

        fastify.addHook('onClose', hooks.onClose);

        fastify.decorateRequest(
            'sendTimingMetric',
            mode === 'static'
                ? staticMode.bindTimingMetric(stats)
                : dynamicMode.bindTimingMetric(stats)
        );
        fastify.decorateRequest(
            'sendCounterMetric',
            mode === 'static'
                ? staticMode.bindCounterMetric(stats)
                : dynamicMode.bindCounterMetric(stats)
        );
        fastify.decorateRequest(
            'sendGaugeMetric',
            mode === 'static'
                ? staticMode.bindGaugeMetric(stats)
                : dynamicMode.bindGaugeMetric(stats)
        );
        fastify.decorateRequest(
            'sendSetMetric',
            mode === 'static'
                ? staticMode.bindSetMetric(stats)
                : dynamicMode.bindSetMetric(stats)
        );
        fastify.decorateRequest(
            'getMetricLabel',
            mode === 'static'
                ? staticMode.getRouteLabel
                : dynamicMode.getRouteLabel
        );

        fastify.decorateReply(
            'sendTimingMetric',
            mode === 'static'
                ? staticMode.bindTimingMetric(stats)
                : dynamicMode.bindTimingMetric(stats)
        );
        fastify.decorateReply(
            'sendCounterMetric',
            mode === 'static'
                ? staticMode.bindCounterMetric(stats)
                : dynamicMode.bindCounterMetric(stats)
        );
        fastify.decorateReply(
            'sendGaugeMetric',
            mode === 'static'
                ? staticMode.bindGaugeMetric(stats)
                : dynamicMode.bindGaugeMetric(stats)
        );
        fastify.decorateReply(
            'sendSetMetric',
            mode === 'static'
                ? staticMode.bindSetMetric(stats)
                : dynamicMode.bindSetMetric(stats)
        );
        fastify.decorateReply(
            'getMetricLabel',
            mode === 'static'
                ? staticMode.getRouteLabel
                : dynamicMode.getRouteLabel
        );

        if (metricsConfig.routes.hits) {
            fastify.addHook('onRequest', hooks.onRequest);
        }
        if (metricsConfig.routes.timing) {
            fastify.addHook('onResponse', hooks.onResponse);
        }
        if (metricsConfig.routes.errors) {
            fastify.addHook('onError', hooks.onError);
        }
    },
    {
        name: '@immobiliarelabs/fastify-metrics',
        fastify: '3.x',
    }
);
