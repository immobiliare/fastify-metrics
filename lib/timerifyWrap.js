'use strict';

const { performance } = require('perf_hooks');

module.exports = function timerifyWrap(name, fn, onSend) {
    return function timerified(...args) {
        let start;
        const done = () => {
            const end = performance.now();
            const value = end - start;
            onSend(name, value);
        };
        start = performance.now();
        const result = Reflect.apply(fn, this, args);
        if (result && typeof result.finally === 'function') {
            return result.finally(done);
        }
        done();
        return result;
    };
};
