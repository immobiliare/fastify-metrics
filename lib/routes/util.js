'use strict';

exports.shouldSkip = (requestOrReply) => {
    return requestOrReply.routeConfig
        ? !(
              requestOrReply.routeConfig &&
              requestOrReply.routeConfig.metrics &&
              requestOrReply.routeConfig.metrics.routeId
          )
        : !(
              requestOrReply.request.routeConfig &&
              requestOrReply.request.routeConfig.metrics &&
              requestOrReply.request.routeConfig.metrics.routeId
          );
};
