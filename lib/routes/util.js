'use strict';

exports.shouldSkip = (requestOrReply) => {
    const routeOptions = requestOrReply.routeOptions;
    if (routeOptions) {
        return !routeOptions.metrics?.routeId
    } else {
        return !requestOrReply.request.routeOptions?.config?.metrics?.routeId
    }
};
