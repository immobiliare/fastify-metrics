'use strict';

exports.shouldSkip = function (requestOrReply) {
    if (
        !(
            requestOrReply.context.config &&
            requestOrReply.context.config.metrics &&
            requestOrReply.context.config.metrics.routeId
        )
    )
        return true;
    return false;
};
