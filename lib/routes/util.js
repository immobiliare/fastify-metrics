'use strict';

exports.shouldSkip = (requestOrReply) => {
    return requestOrReply?.routeOptions?.config
        ? !(
              requestOrReply.routeOptions.config &&
              requestOrReply.routeOptions.config.metrics &&
              requestOrReply.routeOptions.config.metrics.routeId
          )
        : !(
              requestOrReply.request.routeOptions.config &&
              requestOrReply.request.routeOptions.config.metrics &&
              requestOrReply.request.routeOptions.config.metrics.routeId
          );
};
