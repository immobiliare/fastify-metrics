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
    reply.sendTimingMetric('response_time', reply.elapsedTime);
    next();
};

exports.onRequestSize = function (request, reply, next) {
    const contentLength = request.headers && request.headers['content-length'];
    if (contentLength && contentLength !== '0') {
        reply.sendTimingMetric('request_size', contentLength);
    }
    next();
};

exports.onResponseSize = function (request, reply, payload, next) {
    const contentLength = reply.getHeader('content-length');
    if (contentLength && contentLength !== '0') {
        reply.sendTimingMetric('response_size', contentLength);
    }
    next();
};

exports.onError = function (request, reply, error, done) {
    let code = undefined;
    /* istanbul ignore next */
    if (!reply.statusCode || reply.statusCode === 200) {
        // reply has 200 statusCode by default with fastify 4 so we need to check and retrieve the status code of the Error object.
        // @see https://github.com/fastify/fastify/issues/4501
        code = error.statusCode || error.status || 500;
    } else {
        code = reply.statusCode < 400 ? 500 : reply.statusCode;
    }

    request.sendCounterMetric(`errors.${code}`);
    done();
};
