'use strict';

exports.start = async function (app, mock, fastifyPort, mockPort) {
    try {
        await mock.start(mockPort);
        await app.listen(fastifyPort);
        console.log(`Server listening on port ${app.server.address().port}
Routes
${app.printRoutes({ commonPrefix: false })}`);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
