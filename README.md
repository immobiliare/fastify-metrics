<p align="center"><img src="./logo.png" alt="logo" width="250px" /></p>

<h1 align="center">fastify-metrics</h1>

[![Release](https://github.com/immobiliare/fastify-metrics/actions/workflows/release.yml/badge.svg)](https://github.com/immobiliare/fastify-metrics/actions/workflows/release.yml)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier?style=flat-square)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)
![npm (scoped)](https://img.shields.io/npm/v/@immobiliarelabs/fastify-metrics)
![license](https://img.shields.io/github/license/immobiliare/fastify-metrics)

> A slighlty opinionated [Fastify](https://www.fastify.io/) plugin that collects metrics and dispatches them to [statsd](https://github.com/statsd/statsd).

If you write your services and apps using `Fastify` and also use `statsd`, this plugin might be for you!

It automatically collects Node.js process metrics along with routes stats like hit count, timings and errors and uses the [`Dats`](https://github.com/immobiliare/dats) client to send them to a `stasd` collector.

> ⚠️ Fastify 4 introduced some breaking changes, please refer to [this](#fastify-version-support) version support table to find what works best for you!

## Table of Content

<!-- toc -->

-   [Fastify Version Support](#fastify-version-support)

*   [Installation](#installation)
    -   [`npm`](#npm)
    -   [`yarn`](#yarn)
*   [Migrating from version 1](#migrating-from-version-1)
*   [Usage](#usage)
*   [Route Configuration](#route-configuration)
    -   [Note](#note)
*   [Metrics collected](#metrics-collected)
*   [Decorators](#decorators)
    -   [Fastify decorators](#fastify-decorators)
        -   [`metrics`](#metrics)
            -   [`metrics.namespace`](#metricsnamespace)
            -   [`metrics.fastifyPrefix`](#metricsfastifyprefix)
            -   [`metrics.routesPrefix`](#metricsroutesprefix)
            -   [`metrics.client`](#metricsclient)
            -   [`metrics.sampler`](#metricssampler)
            -   [`metrics.hrtime2us`](#metricshrtime2us)
            -   [`metrics.hrtime2ns`](#metricshrtime2ns)
            -   [`metrics.hrtime2ms`](#metricshrtime2ms)
            -   [`metrics.hrtime2s`](#metricshrtime2s)
    -   [Request and Reply decorators](#request-and-reply-decorators)
        -   [`getMetricLabel()`](#getmetriclabel)
        -   [`sendTimingMetric(name[, value])`](#sendtimingmetricname-value)
        -   [`sendCounterMetric(name[, value])`](#sendcountermetricname-value)
        -   [`sendGaugeMetric(name, value)`](#sendgaugemetricname-value)
        -   [`sendSetMetric(name, value)`](#sendsetmetricname-value)
*   [Hooks](#hooks)
*   [Request and Reply routeConfig](#request-and-reply-routeconfig)
*   [API](#api)
    -   [Configuration `options`](#configuration-options)
    -   [Routes labels generation modes](#routes-labels-generation-modes)
        -   [computedPrefix](#computedprefix)
        *   [`static` mode](#static-mode)
            -   [`getLabel(options)`](#getlabeloptions)
        *   [`dynamic` mode](#dynamic-mode)
            -   [`getLabel(request, reply)`](#getlabelrequest-reply)
            -   [Example](#example)
*   [Powered Apps](#powered-apps)
*   [Support & Contribute](#support--contribute)
*   [License](#license)

<!-- tocstop -->

### Fastify Version Support

| `Node.js` | `fastify` | `@immobiliarelabs/fastify-metrics` |
| --------- | --------- | ---------------------------------- |
| `<14`     | `3`       | `3`                                |
| `>14`     | `4`       | `4`                                |

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

## Migrating from version 1

See the [migration guide](./MIGRATION_GUIDE.md) if you have to migrate from the version 1 to 2 of this plugin.

## Usage

```js
const fastify = require('fastify')();

await fastify.register(require('@immobiliarelabs/fastify-metrics'), {
    client: {
        host: 'udp://someip:someport',
        namespace: 'ns',
    },
});

const route = {
    // This is required in order to associate a metric to a route
    // If an object `metrics` with a `routeId` is not passed the route stats will be
    // ignored.
    config: {
        metrics: {
            routeId: 'root.getStatus',
        },
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

## Route Configuration

To configure a route, you have to pass a `metrics` object with the `routeId` key set with a not empty string.

If the `routeId` is not passed or is set with a falsy value, the route will not be metricated, and all route metrics methods will be disabled.

There are more usage examples in the [`examples`](./examples) folder.

### Note

The plugin internally uses the `routeId` key in the `metrics` object of the `Request.routeConfig` or `Reply.request.routeConfig` object to build the label of the metric of a route.

See

-   https://www.fastify.io/docs/latest/Reference/Routes/#config
-   https://www.fastify.io/docs/latest/Reference/Reply/
-   https://www.fastify.io/docs/latest/Reference/Request/

## Metrics collected

These are the metrics that can be collected with their respective label.

| Name                                                                 | Type      | Unit of measure                 | Description                    |
| :------------------------------------------------------------------- | :-------- | :------------------------------ | :----------------------------- |
| `<METRICS_NAMESPACE>.process.cpu`                                    | `gauge`   | percentage                      | process cpu usage              |
| `<METRICS_NAMESPACE>.process.mem.external`                           | `gauge`   | bytes                           | process external memory        |
| `<METRICS_NAMESPACE>.process.mem.rss`                                | `gauge`   | bytes                           | process rss memory             |
| `<METRICS_NAMESPACE>.process.mem.heapUsed`                           | `gauge`   | bytes                           | process heap used memory       |
| `<METRICS_NAMESPACE>.process.mem.heapTotal`                          | `gauge`   | bytes                           | process heap total memory      |
| `<METRICS_NAMESPACE>.process.eventLoopDelay`                         | `gauge`   | milliseconds                    | process event loop delay       |
| `<METRICS_NAMESPACE>.process.eventLoopUtilization`                   | `gauge`   | absolute number between 0 and 1 | process event loop utilization |
| `<METRICS_NAMESPACE>.<computedPrefix>.<routeId>.requests`            | `counter` | unit                            | requests count per service     |
| `<METRICS_NAMESPACE>.<computedPrefix>.<routeId>.errors.<statusCode>` | `counter` | unit                            | errors count per service       |
| `<METRICS_NAMESPACE>.<computedPrefix>.<routeId>.request_size`        | `timing`  | bytes                           | request size                   |
| `<METRICS_NAMESPACE>.<computedPrefix>.<routeId>.response_time`       | `timing`  | milliseconds                    | response time                  |
| `<METRICS_NAMESPACE>.<computedPrefix>.<routeId>.response_size`       | `timing`  | bytes                           | response size                  |

**To know more about how the `computedPrefix` and the route label are built see [here](#routes-labels-generation-modes)**.

## Decorators

The plugin adds some decorators to both the fastify instance and the reply object.

### Fastify decorators

#### `metrics`

-   <`object`>

An object containing the following properties:

##### `metrics.namespace`

-   <`string`>

The `namespace` passed to the plugin configuration option.

##### `metrics.fastifyPrefix`

-   <`string`>

The normalized fastify instance `prefix`.

##### `metrics.routesPrefix`

-   <`string`>

The normalized routes `prefix` passed to the `routes.prefix` option.

##### `metrics.client`

The [Dats](https://github.com/immobiliare/dats) instance.

##### `metrics.sampler`

The [sampler](https://github.com/dnlup/doc) instance used to sample process metrics, if `options.health` is `true`.

##### `metrics.hrtime2us`

A utility function to convert the legacy `process.hrtime([time])` value to microseconds.

See [hrtime-utils](https://github.com/dnlup/hrtime-utils#hrtime2ustime).

##### `metrics.hrtime2ns`

A utility function to convert the legacy `process.hrtime([time])` value to nanoseconds.

See [hrtime-utils](https://github.com/dnlup/hrtime-utils#hrtime2nstime).

##### `metrics.hrtime2ms`

A utility function to convert the legacy `process.hrtime([time])` value to milliseconds.

See [hrtime-utils](https://github.com/dnlup/hrtime-utils#hrtime2mstime).

##### `metrics.hrtime2s`

A utility function to convert the legacy `process.hrtime([time])` value to seconds.

See [hrtime-utils](https://github.com/dnlup/hrtime-utils#hrtime2stime).

### Request and Reply decorators

#### `getMetricLabel()`

-   **Returns** <`string`> The computed metric label of the route.

#### `sendTimingMetric(name[, value])`

-   name <`string`> The name of the metric
-   value <`number`> The value of the metric

It sends a timing metric. It automatically prepends the route label to the passed `name`. It is just a small wrapper of the native `Dats` client method.

#### `sendCounterMetric(name[, value])`

-   name <`string`> The name of the metric
-   value <`number`> The value of the metric

It sends a counter metric. It automatically prepends the route label to the passed `name`. It is just a small wrapper of the native `Dats` client method.

#### `sendGaugeMetric(name, value)`

-   name <`string`> The name of the metric
-   value <`number`> The value of the metric

It sends a gauge metric. It automatically prepends the route label to the passed `name`. It is just a small wrapper of the native `Dats` client method.

#### `sendSetMetric(name, value)`

-   name <`string`> The name of the metric
-   value <`number`> The value of the metric

It sends a timing metric. It automatically prepends the route label to the passed `name`. It is just a small wrapper of the native `Dats` client method.

## Hooks

The plugin uses the following hooks:

-   `onRoute`: to generate the route labels at startup time if `routes.mode` is set to `'static'`.
-   `onClose`: to close the [Dats](https://github.com/immobiliare/dats) instance and the [sampler](https://github.com/dnlup/doc#new-docsampleroptions) instance.
-   `onRequest`: it registers a hook to count requests and, if `routes.mode` is set to `'dynamic'`, it adds another one to generate the route label.
-   `onResponse`: to measure response time
-   `onError`: to count errors

## Request and Reply routeConfig

The plugin adds a `metrics` object to the `Request.routeConfig` and `Reply.request.routeConfig` for convenience with the following properties:

-   `routeId` <`string`> The id for the current route
-   `fastifyPrefix` <`string`> The prefix of the fastify instance registering the route, with the `/` replaced with `.` and without the `.` at the beginning.
-   `routesPrefix` <`string`> The routes prefix passed to the plugin options and without `.` at the beginning and end.

These properties can be useful when using a custom [`getLabel`](routes-labels-generation-modes) function.

## API

This module exports a [plugin registration function](https://github.com/fastify/fastify/blob/master/docs/Plugins-Guide.md#register).

### Configuration `options`

> The plugin is configured with an object with the following properties

-   `client` <`Object`|`Client`> The statsd client [configuration](https://github.com/immobiliare/dats#new-clientoptions) object or a [`Client`](https://github.com/immobiliare/dats) instance. When using the options object, a default `onError` function is used to log with level `error` the event with the app logger.
-   `routes` <`boolean`|`Object`> Routes metrics configuration. If set to `false` it disables the collection of all the default routes metrics.
    -   `mode` <`'static'`|`'dynamic'`> The [strategy](#routes-labels-generation-modes) to generate the route metric label.
    -   `prefix` <`string`> The prefix to use for the routes labels (`<METRICS_NAMESPACE>.<computedPrefix>.<routeId>.*`). It defaults to `''` (no prefix).
    -   `getLabel` <`Function`> A custom function to generate the route label. It has a different signature depending on the [mode](#routes-labels-generation-modes).
    -   `timing` <`boolean`> Collect response timings (`<METRICS_NAMESPACE>.<computedPrefix>.<routeId>`). Default: `true`.
    -   `requestSize` <`boolean`> Collect request size (`<METRICS_NAMESPACE>.<computedPrefix>.requests.<routeId>`). Default: `false`.
    -   `responseSize` <`boolean`> Collect response size (`<METRICS_NAMESPACE>.<computedPrefix>.requests.<routeId>`). Default: `false`.
    -   `hits` <`boolean`> Collect requests count (`<METRICS_NAMESPACE>.<computedPrefix>.requests.<routeId>`). Default: `true`.
    -   `errors` <`boolean`> Collect errors count (`<METRICS_NAMESPACE>.<computedPrefix>.errors.<routeId>.<statusCode>`). Default: `true`.
-   `health` <`boolean`|`Object`> Flag to enable/disable the collection of the process health data(`<METRICS_NAMESPACE>.process.*`) or an object to configure a subset of the health metrics provided by the [sampler](https://github.com/dnlup/doc#new-docsampleroptions). Default: `true`.
    -   `sampleInterval` <`number`> The number of milliseconds of the interval to get the metrics sample.
    -   `eventLoopOptions` <`Object`> The options object used to configure the core [`monitorEventLoopDelay`](https://nodejs.org/docs/latest-v16.x/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions).

### Routes labels generation modes

There are two different modes to generate the label for each route:

-   `static`
-   `dynamic`

##### computedPrefix

In both modes by default the plugin generates a prefix using:

-   the [`fastify` prefix](https://www.fastify.io/docs/latest/Reference/Server/#prefix) used to register the plugin (normalized replacing `/` with `.`), we call it `fastifyPrefix`
-   the routes prefix passed to the plugin option `routes.prefix`, we call it `routesPrefix`

Generating a computed prefix like this:

`<fastifyPrefix>.<routesPrefix>`

#### `static` mode

In this mode a [`onRoute` hook](https://www.fastify.io/docs/latest/Reference/Hooks/#onroute) is registered in the `fastify` instance and the plugin generates a label at startup time combining the following strings:

-   the [`fastify` prefix](https://www.fastify.io/docs/latest/Reference/Server/#prefix) used to register the plugin, accessible via the `prefix` key of the route registration options.
-   the routes prefix passed in the plugin options, accessible as a parameter of the internal `getLabel` function.
-   the `config.metrics.routeId` string used to configure the route, acessible via the `config` key of the route registration options.

The `getLabel` function in this mode will have the following signature:

##### `getLabel(options)`

-   `options` [<`Object`>](https://www.fastify.io/docs/latest/Reference/Hooks/#onroute) The route registration
    -   `config`
        -   `metrics`
            -   `routeId` <`string`> The id used to initialize the route.
            -   `fastifyPrefix` <`string`> The normalized prefix of the fastify instance registering the route.
            -   `routesPrefix` <`string`> The normalized routes prefix passed to the plugin options.
-   **Returns:** <`string`> The route label string without any `.` at the beginning or end.

Pay attention to avoid returing empty strings or strings with leading and trailing `.`.

#### `dynamic` mode

In this mode a [`onRequest` hook](https://www.fastify.io/docs/latest/Reference/Hooks/#onrequest) is registerd in the `fastify` instance and the plugin generates a label and attaches it to each request and reply combining the following strings:

-   the [`fastify` prefix](https://www.fastify.io/docs/latest/Reference/Server/#prefix) used to register the plugin, accessible via the `prefix` key of the `fastify` instance.
-   the routes prefix passed in the plugin options, accessible via the `metricsRoutesPrefix` decorator of the `fastify` instance.
-   the `config.metrics.routeId` string used to configure the route, acessible via the `config` key of the `request` or `reply` context.

The `getLabel` function in this mode will have the following signature:

##### `getLabel(request, reply)`

-   `request`
-   `reply`
-   **Returns:** <`string`> The route label string without any `.` at the beginning or end.

The `this` context of the function is bound to the fastify instance of the request. Pay attention to avoid returing empty strings or strings with leading and trailing `.`. Also, don't use arrow functions otherwhise the `this` context won't refer to the fastify instance.

If you don't pass your custom function, the default one returns the same string computed in `static` mode. Hence, the `dynamic` mode is not very useful if you don't define your own `getLabel` function.

##### Example

```js
const fastify = require('fastify')();

await fastify.register(require('@immobiliarelabs/fastify-metrics'), {
    client: {
        host: 'udp://someip:someport',
        namespace: 'ns',
    },
    routes: {
        mode: 'dynamic',
        getLabel: function (request, reply) {
            const auth = request.user ? 'user' : 'anonim';
            const { metrics } = request.routeConfig.config;
            const routesPrefix = metrics.routesPrefix
                ? `${metrics.routesPrefix}.`
                : '';
            const fastifyPrefix = metrics.fastifyPrefix
                ? `${metrics.fastifyPrefix}.`
                : '';
            const routeId = metrics.routeId ? `${metrics.routeId}.` : '';
            return `${fastifyPrefix}${routesPrefix}${routeId}${auth}`;
        },
    },
});

const route = {
    config: {
        metrics: {
            routeId: 'root.getStatus',
        },
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
