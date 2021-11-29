'use strict';

const { performance, PerformanceObserver } = require('perf_hooks');

// TODO: use WeakRef and finalizationRegistry to trigger the cleanup?
// TODO: use a linked list?
let flist = [];
let obs = null;

module.exports = function nativeTimerifyWrap(name, fn, onSend, opts) {
    const wrapped = performance.timerify(fn, opts);
    return function timerified(...args) {
        if (!obs) {
            obs = new PerformanceObserver((list) => {
                const entry = list.getEntries()[0];
                const i = flist.indexOf(entry.name);
                /* istanbul ignore else */
                if (i !== -1) {
                    flist.splice(i, 1);
                    onSend(entry.name, entry);
                }
                if (flist.length === 0) {
                    obs.disconnect();
                    obs = null;
                }
            });
            obs.observe({ entryTypes: ['function'] });
        }
        flist.push(name);
        return Reflect.apply(wrapped, this, args);
    };
};
