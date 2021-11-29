'use strict';

const { performance, PerformanceObserver } = require('perf_hooks');

module.exports = function nativeTimerifyWrap(name, fn, onSend, opts) {
    const wrapped = performance.timerify(fn, opts);
    return function timerified(...args) {
        const obs = new PerformanceObserver((list) => {
            const entry = list.getEntries()[0];
            if (fn.name === entry.name) {
                onSend(name, entry);
                obs.disconnect();
            }
        });
        obs.observe({ entryTypes: ['function'] });
        return Reflect.apply(wrapped, this, args);
    };
};
