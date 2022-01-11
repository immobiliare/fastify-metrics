'use strict';

exports.onClose = function (instance, done) {
    instance.doc && instance.doc.stop();
    instance.metricsClient.close(done);
};

exports.onRequest = function (request, reply, next) {
    request.sendCounterMetric('requests');
    next();
};

exports.onResponse = function (request, reply, next) {
    reply.sendTimingMetric('response_time', reply.getResponseTime());
    next();
};

exports.onError = function (request, reply, error, done) {
    request.sendCounterMetric(`errors.${reply.statusCode}`);
    done();
};
