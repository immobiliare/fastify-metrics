'use strict';

const fastify = require('fastify');

const service = fastify({
    logger: {
        level: 'error',
    },
});

service.register(require('../..'), {
    host: 'udp://127.0.0.1:20000',
    namespace: 'ns',
    sampleInterval: 1000,
    bufferSize: 1024,
    collect: {
        routes: {
            mode: 'dynamic',
        },
    },
});

service.get(
    '/',
    {
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        version: { type: 'number' },
                    },
                },
            },
        },
    },
    async () => {
        return {
            name: 'base-server',
            version: 1,
        };
    }
);

service.listen(3002, (error) => {
    if (error) {
        service.log.error(error);
        process.exit(1);
    }
});
