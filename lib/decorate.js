'use strict';

const staticMode = require('./routes/static');
const dynamicMode = require('./routes/dynamic');

function decorate(fastify, obj, client) {
    for (const [k, bind] of Object.entries(obj)) {
        if (k === 'getMetricLabel') {
            fastify.decorateRequest(k, bind('request'));
            fastify.decorateReply(k, bind('reply'));
        } else {
            fastify.decorateRequest(k, bind(client));
            fastify.decorateReply(k, bind(client));
        }
    }
}

module.exports = (fastify, mode, client) => {
    if (mode === 'dynamic') {
        decorate(fastify, dynamicMode.decorators, client);
    } else {
        decorate(fastify, staticMode.decorators, client);
    }
};
