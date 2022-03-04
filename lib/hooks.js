'use strict';

exports.onClose = function (instance, done) {
    instance.metrics.sampler && instance.metrics.sampler.stop();
    instance.metrics.client.close(done);
};

exports.onRequest = function (request, reply, next) {
    request.sendCounterMetric('requests');
    next();
};

exports.onResponse = function (request, reply, next) {
    reply.sendTimingMetric('response_time', reply.getResponseTime());
    next();
};

exports.onRequestSize = function (request, reply, next) {
    const contentLength = request.headers && request.headers['content-length'];
    if (contentLength && contentLength !== '0') {
        reply.sendCounterMetric('request_size', contentLength);
    }
    next();
};

exports.onResponseSize = function (request, reply, payload, next) {
    const contentLength = reply.getHeader('content-length');
    if (contentLength && contentLength !== '0') {
        reply.sendCounterMetric('response_size', contentLength);
    }
    next();
};

exports.onError = function (request, reply, error, done) {
    request.sendCounterMetric(`errors.${reply.statusCode}`);
    done();
};
