const fastify = require('fastify')();
const metrics = require('./index');

fastify.register(metrics, {
    host: 'udp://localhost:9999',
    namespace: 'ns',
    routes: {
        responseSize: true,
        requestSize: true,
    },
});

fastify.route({
    url: '/',
    method: ['GET', 'POST'],
    config: {
        metrics: {
            routeId: 'asd',
        },
    },
    handler: (_, reply) => {
        reply.send({ hello: 'world' });
    },
});

fastify.listen(3000);
