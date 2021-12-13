'use strict';

const { performance, PerformanceObserver } = require('perf_hooks');

/**
 * A map that associates metrics labels to timerified
 * functions and send hooks.
 */
const map = new Map();
let obs = null;

const registry = new FinalizationRegistry((label) => {
    map.delete(label);
    if (map.size === 0 && obs) {
        obs.disconnect();
        obs = null;
    }
});

function wrap(fn, opts) {
    // TODO: throw an error if a function woth the same name is already
    // present?
    const wrapped = performance.timerify(fn, opts.timerifyOptions);
    if (!obs) {
        obs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                const i = map.get(entry.name);
                const name = i[0];
                const onSend = i[1];
                /* istanbul ignore else */
                if (name) {
                    onSend(name, entry);
                }
            }
        });
        obs.observe({ entryTypes: ['function'] });
    }
    map.set(fn.name, [opts.label, opts.onSend, wrapped]);
    registry.register(wrapped, opts.label);
    return wrapped;
}

function sendPerfEntry(name, entry) {
    this.stats.timing(name, entry.duration);
}

// This is here just to simplify testing.
exports.clear = function () {
    for (const [k, v] of map.entries()) {
        registry.unregister(v[2]);
        map.delete(k);
    }
    obs && obs.disconnect();
    obs = null;
};

// Bind a timerify wrap factory to a specific fastify instance.
exports.timerifyWrap = function (fastify) {
    const _onSend = sendPerfEntry.bind(fastify);
    return function timerify(fn, opts) {
        if (typeof fn !== 'function') {
            throw new Error('You have to pass a function to timerify');
        }
        const defaults = {
            label: fn.name,
            onSend: _onSend,
            timerifyOptions: undefined,
        };
        const options = Object.assign({}, defaults, opts);
        if (typeof options.label !== 'string') {
            throw new Error(
                'You have to pass a string to label the timerified function metric'
            );
        }
        if (typeof options.onSend !== 'function') {
            throw new Error(
                'You have to pass a function to the custom onSend hook'
            );
        }
        if (options.onSend !== _onSend) {
            // `this` refers to the fastify instance decorated with the timerify util.
            options.onSend = options.onSend.bind(this);
        }
        return wrap(fn, options);
    };
};
