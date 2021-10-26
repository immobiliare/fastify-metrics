# fastify-metrics

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)

> [Fastify](https://www.fastify.io/) plugin that integrates metrics collection and dispatch to [statsd](https://github.com/statsd/statsd).

Supports Fastify versions `>=3.0.0`.

<!-- toc -->

- [fastify-metrics](#fastify-metrics)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Notes](#notes)
  - [Metrics collected](#metrics-collected)
  - [Decorators](#decorators)
  - [Hooks](#hooks)
  - [API](#api)
    - [Configuration `options`](#configuration-options)
  - [Contributing](#contributing)

<!-- tocstop -->

## Installation

The package is available at http://sinopia.rete.farm:4873/#/detail/@immobiliarelabs/fastify-metrics.

You can install it with `npm`

```bash
# lastest stable version
$ npm i -S @immobiliarelabs/fastify-metrics
# latest development version
$ npm i -S @immobiliarelabs/fastify-metrics@next
```

or `yarn`

```bash
# lastest stable version
$ yarn add @immobiliarelabs/fastify-metrics
# latest development version
$ yarn @immobiliarelabs/fastify-metrics@next
```

## Usage

```js
const fastify = require('fastify')();

fastify.register(require('@immobiliarelabs/fastify-metrics'), {
    host: 'udp://someip:someport',
    namespace: 'ns',
});

const route = {
    // This is required in order to associate a metric to a route
    config: {
        routeId: 'root.getStatus',
    },
    url: '/',
    method: 'GET',
    handler(request, reply) {
        reply.send({ ok: true });
    },
};
fastify.route(route);

fastify.listen(3000);
```

### Notes

The plugin uses the key `routeId` in the `config` object of the `Reply.context`. If none is found a default `noId` string is used.

See https://github.com/fastify/fastify/blob/master/docs/Routes.md#config.

## Metrics collected

| Name                                                    | Type      | Unit of measure                 | Description                                    |
| :------------------------------------------------------ | :-------- | :------------------------------ | :--------------------------------------------- |
| `<METRICS_NAMESPACE>.process.cpu`                       | `gauge`   | percentage                      | process cpu usage                              |
| `<METRICS_NAMESPACE>.process.mem.external`              | `gauge`   | bytes                           | process external memory                        |
| `<METRICS_NAMESPACE>.process.mem.rss`                   | `gauge`   | bytes                           | process rss memory                             |
| `<METRICS_NAMESPACE>.process.mem.heapUsed`              | `gauge`   | bytes                           | process heap used memory                       |
| `<METRICS_NAMESPACE>.process.mem.heapTotal`             | `gauge`   | bytes                           | process heap total memory                      |
| `<METRICS_NAMESPACE>.process.eventLoopDelay`            | `gauge`   | milliseconds                    | process event loop delay                       |
| `<METRICS_NAMESPACE>.process.eventLoopUtilization`      | `gauge`   | absolute number between 0 and 1 | process event loop utilization                 |
| `<METRICS_NAMESPACE>.api.<routeId>.requests`            | `counter` | unit                            | requests count per service route               |
| `<METRICS_NAMESPACE>.api.<routeId>.errors.<statusCode>` | `counter` | unit                            | errors count per service route and status code |
| `<METRICS_NAMESPACE>.api.<routeId>.response_time`       | `timing`  | milliseconds                    | response time per service route                |

## Decorators

-   `fastify.stats`: A [dats](https://github.com/immobiliare/dats) instance
-   `fastify.hrtime2ns`: A utility function to convert `process.hrtime([time])` to nanoseconds
-   `fastify.hrtime2ms`: A utility function to convert `process.hrtime([time])` to milliseconds
-   `fastify.hrtime2s`: A utility function to convert `process.hrtime([time])` to seconds

## Hooks

-   `onClose`: To close the [dats](https://github.com/immobiliare/dats) instance
-   `onRequest`: To count requests
-   `onResponse`: To measure response time
-   `onError`: To count errors

## API

This module exports a [plugin registration function](https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md#register).

### Configuration `options`

> The plugin is configured with an object with the following properties

-   `host`: String. [statsd](https://github.com/statsd/statsd) host. See [dats](https://github.com/immobiliare/dats#new-clientoptions).
-   `namespace`: String. Metrics namespace. See [dats](https://github.com/immobiliare/dats#new-clientoptions).
-   `bufferSize`: Number. Metrics buffer size. See [dats](https://github.com/immobiliare/dats#new-clientoptions).
-   `bufferFlushTimeout`: Number. Metrics buffer flush timeout. See [dats](https://github.com/immobiliare/dats#new-clientoptions).
-   `sampleInterval`: Number. Optional. Sample interval in `ms` used to gather process stats. Defaults to `1000`.
-   `afterSend`: Function: `(err) => void`. Optional. This function is called after each metric send. Default: `(err) => err && log(err)`
-   `udpDnsCache`: Boolean. Optional. Activate udpDnsCache. Default `true`.
-   `udpDnsCacheTTL`: Number. Optional. DNS cache Time to live of an entry in seconds. Default `120`.
-   `collect`: Object. Optional. Which metrics the plugin should track.
    -   `collect.timings`: Boolean. Collect response timings (`<METRICS_NAMESPACE>.api.<routeId>`). Default: `true`.
    -   `collect.hits`: Boolean. Collect requests count (`<METRICS_NAMESPACE>.api.requests.<routeId>`). Default: `true`.
    -   `collect.errors`: Boolean. Collect errors count (`<METRICS_NAMESPACE>.api.errors.<routeId>.<statusCode>`). Default: `true`.
    -   `collect.health`: Boolean. Collect process health data (`<METRICS_NAMESPACE>.process.*`). Default: `true`.

## Contributing

See [the contributing section](./CONTRIBUTING.md).
