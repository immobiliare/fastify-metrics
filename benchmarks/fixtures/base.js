'use strict';

const fastify = require('fastify');

const service = fastify();

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

service.listen({ port: 3000 }, (error) => {
    if (error) {
        service.log.error(error);
        process.exit(1);
    }
});
