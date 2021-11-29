'use strict';

const { performance, PerformanceObserver } = require('perf_hooks');

// TODO: use WeakRef and finalizationRegistry to trigger the cleanup?
const flist = new Map();
let obs = null;

module.exports = function nativeTimerifyWrap(name, fn, onSend, opts) {
    const wrapped = performance.timerify(fn, opts);
    return function timerified(...args) {
        if (!obs) {
            obs = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    /* istanbul ignore else */
                    const name = flist.get(entry.name);
                    if (name) {
                        flist.delete(entry.name);
                        onSend(name, entry);
                    }
                    if (flist.size === 0) {
                        obs.disconnect();
                        obs = null;
                    }
                }
            });
            obs.observe({ entryTypes: ['function'] });
        }
        flist.set(fn.name, name);
        return Reflect.apply(wrapped, this, args);
    };
};
