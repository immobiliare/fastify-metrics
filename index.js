'use strict';

const fp = require('fastify-plugin');
const { default: Client } = require('@immobiliarelabs/dats');
const doc = require('@dnlup/doc');
const { hrtime2ns, hrtime2ms, hrtime2s } = require('@dnlup/hrtime-utils');
const { gte16 } = require('./lib/utils');
const nativeTimerifyWrap = require('./lib/nativeTimerifyWrap');
const timerifyWrap = require('./lib/timerifyWrap');
const sendTiming = require('./lib/sendTiming');
const sendPerfEntry = require('./lib/sendPerfEntry');

function clientMock() {
    const mock = {
        socket: {
            onError: /* istanbul ignore next */ () => {},
        },
    };
    for (const method of ['on', 'counter', 'timing', 'gauge', 'set']) {
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

function onClose(instance, done) {
    instance.stats.close(done);
}

function hitsCounter(request, reply, next) {
    this.stats.counter(`api.${request.metrics.id}.requests`);
    next();
}

function responseTiming(request, reply, next) {
    this.stats.timing(
        `api.${request.metrics.id}.response_time`,
        reply.getResponseTime()
    );
    next();
}

function errorsCounter(request, reply, error, done) {
    this.stats.counter(`api.${request.metrics.id}.errors.${reply.statusCode}`);
    done();
}

const defaultOnSend = gte16 ? sendPerfEntry : sendTiming;

/**
 * Default metrics that are enabled
 */
const COLLECT = {
    /**
     * Response time
     */
    timing: true,
    /**
     * Route hit counter
     */
    hits: true,
    /**
     * Route errors counter
     */
    errors: true,
    /**
     * Health data
     */
    health: true,
};

module.exports = fp(
    function (
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
            onError = (error) => void fastify.log.error(error),
        },
        next
    ) {
        const enabledMetrics = Object.assign({}, COLLECT, collect);

        for (const key of ['timing', 'hits', 'errors', 'health']) {
            if (typeof enabledMetrics[key] !== 'boolean') {
                return next(new Error(`"${key}" must be a Boolean.`));
            }
        }

        const stats = host
            ? new Client({
                  host,
                  namespace,
                  bufferSize,
                  bufferFlushTimeout,
                  udpDnsCache,
                  udpDnsCacheTTL,
                  onError,
              })
            : clientMock();

        fastify.decorate('stats', stats);

        const _onSend = defaultOnSend.bind(fastify);
        fastify.decorate(
            'timerify',
            function (name, fn, onSend = _onSend, opts) {
                if (typeof name !== 'string') {
                    throw new Error(
                        'You have to pass a string value to name the timerified function metric'
                    );
                }
                if (typeof fn !== 'function') {
                    throw new Error('You have to pass a function to timerify');
                }
                if (typeof onSend !== 'function') {
                    throw new Error(
                        'You have to pass a function to the custom onSend hook'
                    );
                }
                if (onSend !== _onSend) {
                    onSend = onSend.bind(fastify);
                }
                return gte16
                    ? nativeTimerifyWrap(name, fn, onSend, opts)
                    : timerifyWrap(name, fn, onSend);
            }
        );
        fastify.decorate('hrtime2ns', hrtime2ns);
        fastify.decorate('hrtime2ms', hrtime2ms);
        fastify.decorate('hrtime2s', hrtime2s);

        if (enabledMetrics.health) {
            const sampler = doc({ sampleInterval });
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

        if (
            enabledMetrics.timing ||
            enabledMetrics.errors ||
            enabledMetrics.hits
        ) {
            /**
             * Assign a default route id if not defined in the reply
             * config options.
             * @see https://www.fastify.io/docs/latest/Routes/#config
             */
            fastify.addHook('onRequest', function (request, reply, next) {
                request.metrics = {
                    id: reply.context.config.routeId || 'noId',
                };
                next();
            });
        }

        fastify.addHook('onClose', onClose);

        if (enabledMetrics.hits) {
            fastify.addHook('onRequest', hitsCounter);
        }
        if (enabledMetrics.timing) {
            fastify.addHook('onResponse', responseTiming);
        }
        if (enabledMetrics.errors) {
            fastify.addHook('onError', errorsCounter);
        }

        next();
    },
    {
        name: '@immobiliarelabs/fastify-metrics',
        fastify: '3.x',
    }
);
