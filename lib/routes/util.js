'use strict';

exports.shouldSkip = (requestOrReply) =>
    !(
        requestOrReply.context.config &&
        requestOrReply.context.config.metrics &&
        requestOrReply.context.config.metrics.routeId
    );
