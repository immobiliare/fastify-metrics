<p align="center"><img src="./logo.png" alt="logo" width="250px" /></p>

<h1 align="center">fastify-metrics</h1>

![release workflow](https://img.shields.io/github/workflow/status/immobiliare/fastify-metrics/Release)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier?style=flat-square)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)
![npm (scoped)](https://img.shields.io/npm/v/@immobiliarelabs/fastify-metrics)
![license](https://img.shields.io/github/license/immobiliare/fastify-metrics)

> A minimalistic and opinionated [Fastify](https://www.fastify.io/) plugin that collects metrics and dispatches them to [statsd](https://github.com/statsd/statsd).

If you write your services and apps using `Fastify` and also use `statsd`, this plugin might be for you!

It automatically collects Node.js process metrics along with routes hit count, timings and errors and uses the [`Dats`](https://github.com/immobiliare/dats) client to send them to a `stasd` collector.

It supports Fastify versions `>=3.0.0`.

## Table of Content

<!-- toc -->

-   [Installation](#installation)
    -   [`npm`](#npm)
    -   [`yarn`](#yarn)
-   [Usage](#usage)
    -   [Notes](#notes)
-   [Metrics collected](#metrics-collected)
-   [Decorators](#decorators)
    -   [Fastify decorators](#fastify-decorators)
        -   [`metricsNamespace`](#metricsnamespace)
        *   [`metricsRoutesPrefix`](#metricsroutesprefix)
        *   [`metricsClient`](#metricsclient)
        *   [`doc`](#doc)
        *   [`hrtime2ns`](#hrtime2ns)
        *   [`hrtime2ms`](#hrtime2ms)
        *   [`hrtime2s`](#hrtime2s)
    -   [Request and Reply decorators](#request-and-reply-decorators)
        -   [`sendTimingMetric(name[, value])`](#sendtimingmetricname-value)
        -   [`sendCounterMetric(name[, value])`](#sendcountermetricname-value)
        -   [`sendGaugeMetric(name, value)`](#sendgaugemetricname-value)
        -   [`sendSetMetric(name, value)`](#sendsetmetricname-value)
-   [Hooks](#hooks)
-   [API](#api)
    -   [Configuration `options`](#configuration-options)
        -   [Routes labels generation modes](#routes-labels-generation-modes)
            -   [computedPrefix](#computedprefix)
            *   [`static`](#static)
                -   [`getLabel(prefix, options)`](#getlabelprefix-options)
            *   [`dynamic`](#dynamic)
                -   [`getLabel(request, reply)`](#getlabelrequest-reply)
-   [Powered Apps](#powered-apps)
-   [Support & Contribute](#support--contribute)
-   [License](#license)

<!-- tocstop -->

## Installation

### `npm`

```bash
# lastest stable version
$ npm i -S @immobiliarelabs/fastify-metrics
# latest development version
$ npm i -S @immobiliarelabs/fastify-metrics@next
```

### `yarn`

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

These are the metrics that are collected automatically.

| Name                                                                 | Type      | Unit of measure                 | Description                                    |
| :------------------------------------------------------------------- | :-------- | :------------------------------ | :--------------------------------------------- |
| `<METRICS_NAMESPACE>.process.cpu`                                    | `gauge`   | percentage                      | process cpu usage                              |
| `<METRICS_NAMESPACE>.process.mem.external`                           | `gauge`   | bytes                           | process external memory                        |
| `<METRICS_NAMESPACE>.process.mem.rss`                                | `gauge`   | bytes                           | process rss memory                             |
| `<METRICS_NAMESPACE>.process.mem.heapUsed`                           | `gauge`   | bytes                           | process heap used memory                       |
| `<METRICS_NAMESPACE>.process.mem.heapTotal`                          | `gauge`   | bytes                           | process heap total memory                      |
| `<METRICS_NAMESPACE>.process.eventLoopDelay`                         | `gauge`   | milliseconds                    | process event loop delay                       |
| `<METRICS_NAMESPACE>.process.eventLoopUtilization`                   | `gauge`   | absolute number between 0 and 1 | process event loop utilization                 |
| `<METRICS_NAMESPACE>.<computedPrefix>.<routeId>.requests`            | `counter` | unit                            | requests count per service route               |
| `<METRICS_NAMESPACE>.<computedPrefix>.<routeId>.errors.<statusCode>` | `counter` | unit                            | errors count per service route and status code |
| `<METRICS_NAMESPACE>.<computedPrefix>.<routeId>.response_time`       | `timing`  | milliseconds                    | response time per service route                |

## Decorators

The plugin adds some decorators to both the fastify instance and the reply object.

### Fastify decorators

##### `metricsNamespace`

-   <`string`>

The `namespace` passed to the plugin configuration option.

#### `metricsRoutesPrefix`

-   <`string`>

The routes `prefix` passed to the `collect.routes.prefix` option.

#### `metricsClient`

The [Dats](https://github.com/immobiliare/dats) instance.

#### `doc`

The [doc](https://github.com/dnlup/doc) instance used to sample process metrics, if `options.collect.health` is `true`.

#### `hrtime2ns`

A utility function to convert the legacy `process.hrtime([time])` value to nanoseconds.

See [hrtime-utils](https://github.com/dnlup/hrtime-utils#hrtime2nstime).

#### `hrtime2ms`

A utility function to convert the legacy `process.hrtime([time])` value to milliseconds.

See [hrtime-utils](https://github.com/dnlup/hrtime-utils#hrtime2mstime).

#### `hrtime2s`

A utility function to convert the legacy `process.hrtime([time])` value to seconds.

See [hrtime-utils](https://github.com/dnlup/hrtime-utils#hrtime2stime).

### Request and Reply decorators

#### `sendTimingMetric(name[, value])`

-   name <`string`>: the name of the metric
-   value <`number`>: the value of the metric

It sends a timing metric. It automatically prepends the route label to the passed `name`. It is just a small wrapper of the native `Dats` client method.

#### `sendCounterMetric(name[, value])`

-   name <`string`>: the name of the metric
-   value <`number`>: the value of the metric

It sends a counter metric. It automatically prepends the route label to the passed `name`. It is just a small wrapper of the native `Dats` client method.

#### `sendGaugeMetric(name, value)`

-   name <`string`>: the name of the metric
-   value <`number`>: the value of the metric

It sends a gauge metric. It automatically prepends the route label to the passed `name`. It is just a small wrapper of the native `Dats` client method.

#### `sendSetMetric(name, value)`

-   name <`string`>: the name of the metric
-   value <`number`>: the value of the metric

It sends a timing metric. It automatically prepends the route label to the passed `name`. It is just a small wrapper of the native `Dats` client method.

## Hooks

The plugin uses the following hooks:

-   `onRoute`: to generate the route labels at startup time if `collect.routes.mode` is set to `'static'`.
-   `onClose`: to close the [Dats](https://github.com/immobiliare/dats) instance and the [sampler](https://github.com/dnlup/doc#new-docsampleroptions) instance.
-   `onRequest`: it registers a hook to count requests and, if `collect.routes.mode` is set to `'dynamic'`, it adds another one to generate the route label.
-   `onResponse`: to measure response time
-   `onError`: to count errors

## API

This module exports a [plugin registration function](https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md#register).

### Configuration `options`

> The plugin is configured with an object with the following properties

-   `host` <`string`> [statsd](https://github.com/statsd/statsd) host, see [Dats](https://github.com/immobiliare/dats#new-clientoptions).
-   `namespace` <`string`> Metrics namespace, see [Dats](https://github.com/immobiliare/dats#new-clientoptions).
-   `bufferSize` <`number`> Metrics buffer size, see [Dats](https://github.com/immobiliare/dats#new-clientoptions).
-   `bufferFlushTimeout` <`number`> Metrics buffer flush timeout. See [Dats](https://github.com/immobiliare/dats#new-clientoptions).
-   `sampleInterval` <`number`> Optional. The sample interval in `ms` used to gather process stats. It defaults to `1000`.
-   `onError` <`Function`> Optional. This function to handle possible Dats errors (it takes the error as the only parameter). See [Dats](https://github.com/immobiliare/dats#new-clientoptions). Default: `(err) => log(err)`
-   `udpDnsCache` <`boolean`> Optional. Activate udpDnsCache. See [Dats](https://github.com/immobiliare/dats#new-clientoptions). Default `true`.
-   `udpDnsCacheTTL` <`number`> Optional. See [Dats](https://github.com/immobiliare/dats#new-clientoptions). DNS cache Time to live of an entry in seconds. Default `120`.
-   `customDatsClient` [<`Client`>](https://github.com/immobiliare/dats#client). Optional. A custom Dats client. If set, all the `fastify-metrics` parameters of Dats will be ignored.
-   `collect`: Object. Optional. Which metrics the plugin should track.
    -   `routes` <`Object`>: routes metrics configuration
        -   `mode` <`'static'`|`'dynamic'`> The strategy to generate the route metric label.
        -   `prefix` <`string`> The prefix to use for the routes labels (`<METRICS_NAMESPACE>.<computedPrefix>.<routeId>.*`). It defaults to `''` (no prefix).
        -   `getLabel` <`Function`> A custom function to generate the route label. It has a different signature depending on the mode. See []().
        -   `timings`: Boolean. Collect response timings (`<METRICS_NAMESPACE>.<computedPrefix>.<routeId>`). Default: `true`.
        -   `hits`: Boolean. Collect requests count (`<METRICS_NAMESPACE>.<computedPrefix>.requests.<routeId>`). Default: `true`.
        -   `errors`: Boolean. Collect errors count (`<METRICS_NAMESPACE>.<computedPrefix>.errors.<routeId>.<statusCode>`). Default: `true`.
    -   `health`: Boolean. Collect process health data (`<METRICS_NAMESPACE>.process.*`). Default: `true`.

#### Routes labels generation modes

There are two different mode to generate the label for each route that the plugin can see:

-   `static`
-   `dynamic`

###### computedPrefix

In both modes by default the plugin generates a prefix using:

-   the [`fastify` prefix](https://www.fastify.io/docs/latest/Reference/Server/#prefix) used to register the plugin (`fastifyPrefix`)
-   the routes prefix passed in the plugin option `collect.routes.prefix` (`routesPrefix`)

Generating a computed prefix like this:

`<fastifyPrefix>.<routesPrefix>`

##### `static`

In this mode a [`onRoute` hook](https://www.fastify.io/docs/latest/Reference/Hooks/#onroute) is registered in the `fastify` instance and the plugin generates a label at startup time combining the following strings:

-   the [`fastify` prefix](https://www.fastify.io/docs/latest/Reference/Server/#prefix) used to register the plugin, accessible via the `prefix` key of the route registration options.
-   the routes prefix passed in the plugin options, accessible as a parameter of the internal `getLabel` function.
-   the `config.metrics.routeId` string used to configure the route, acessible via the `config` key of the route registration options.

The `getLabel` function in this mode will have the following signature:

###### `getLabel(prefix, options)`

-   `prefix` <`string`> The plugin routes prefix value.
-   `options` [<`Object`>](https://www.fastify.io/docs/latest/Reference/Hooks/#onroute) The route registration options.
-   **Returns:** <`string`> The route label.

##### `dynamic`

In this mode a [`onRequest` hook](https://www.fastify.io/docs/latest/Reference/Hooks/#onrequest) is registerd in the `fastify` instance and the plugin generates a label and attaches it to each request and reply (the `metricsLabel` key) combining the following strings:

-   the [`fastify` prefix](https://www.fastify.io/docs/latest/Reference/Server/#prefix) used to register the plugin, accessible via the `prefix` key of the `fastify` instance.
-   the routes prefix passed in the plugin options, accessible via the `metricsRoutesPrefix` decorator of the `fastify` instance.
-   the `config.metrics.routeId` string used to configure the route, acessible via the `config` key of the `request` or `reply` context.

The `getLabel` function in this mode will have the following signature:

###### `getLabel(request, reply)`

-   `request`
-   `reply`
-   **Returns:** <`string`> The route label.

## Powered Apps

`fastify-metrics` was created by the amazing Node.js team at ImmobiliareLabs, the Tech dept of [Immobiliare.it](https://www.immobiliare.it), the #1 real estate company in Italy.

We are currently using `fastify-metrics` in our products as well as our internal toolings.

**If you are using fastify-metrics in production [drop us a message](mailto://opensource@immobiliare.it)**.

## Support & Contribute

Made with ❤️ by [ImmobiliareLabs](https://github.com/immobiliare) & [Contributors](./CONTRIBUTING.md#contributors)

We'd love for you to contribute to `fastify-metrics`!
If you have any questions on how to use `fastify-metrics`, bugs and enhancement please feel free to reach out by opening a [GitHub Issue](https://github.com/immobiliare/fastify-metrics/issues).

## License

`fastify-metrics` is licensed under the MIT license.  
See the [LICENSE](./LICENSE) file for more information.
