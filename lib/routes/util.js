'use strict';

exports.shouldSkip = (requestOrReply) => {
    const config = requestOrReply.routeOptions.config;
    if (config) {
        return !(
            config.metrics &&
            config.metrics.routeId
        );
    } else {
        const config = requestOrReply.request.routeOptions.config;
        return !(
            config &&
            config.metrics &&
            config.routeId
        );
        
    }
};
