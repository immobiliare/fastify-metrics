<!-- toc -->

-   [Migrating from v4 to v5](#migrating-from-v4-to-v5)
    -   [`.context.config.metrics` access](#contextconfigmetrics-access)
        -   [V4](#v4)
        -   [V5](#v5)
-   [Migrating from v1 to v2](#migrating-from-v1-to-v2)
    -   [`Dats` client options](#dats-client-options)
        -   [V1](#v1)
        -   [V2](#v2)
    -   [Metrics collections setup](#metrics-collections-setup)
        -   [V1](#v1-1)
        -   [V2](#v2-1)
            -   [`health` metric](#health-metric)
            -   [`routes` metrics](#routes-metrics)
    -   [Route id configuration](#route-id-configuration)
        -   [V1](#v1-2)
        -   [V2](#v2-2)

<!-- tocstop -->

# Migrating from v4 to v5

## `<Request|Reply>.context.config.metrics` access

### V4

```js
const metrics = request.context.config.metrics;
const metrics = reply.context.config.metrics;
```

### V5

```js
const metrics = request.routeConfig.metrics;
const metrics = reply.request.routeConfig.metrics;
```

# Migrating from v1 to v2

## `Dats` client options

All the client options are now scoped under a `client` key in the config object.

### V1

```js
const fastify = require('fastify')();

fastify.register(require('@immobiliarelabs/fastify-metrics'), {
    host: 'udp://someip:someport',
    namespace: 'ns',
    // All the other dats options
});
```

### V2

```js
const fastify = require('fastify')();

fastify.register(require('@immobiliarelabs/fastify-metrics'), {
    client: {
        host: 'udp://someip:someport',
        namespace: 'ns',
        // All the other dats options
    },
});
```

For a list of all `Dats` options see [here](https://github.com/immobiliare/dats#new-clientoptions).

## Metrics collections setup

The flags to enable, disable and configure the colelction of some metrics have been modified and brought outside the `collect` key in the options (which we removed).

### V1

```js
const fastify = require('fastify')();

fastify.register(require('@immobiliarelabs/fastify-metrics'), {
    sampleInterval: 1000,
    collect: {
        hits: true,
        timing: true,
        errors: true,
        health: true,
    },
});
```

### V2

#### `health` metric

```js
const fastify = require('fastify')();

fastify.register(require('@immobiliarelabs/fastify-metrics'), {
    health: true,
});
```

With a custom `sampleInterval`:

```js
const fastify = require('fastify')();

fastify.register(require('@immobiliarelabs/fastify-metrics'), {
    health: {
        sampleInterval: 1000,
    },
});
```

#### `routes` metrics

```js
const fastify = require('fastify')();

fastify.register(require('@immobiliarelabs/fastify-metrics'), {
    routes: {
        responseTime: true,
        hits: true,
        errors: true,
    },
});
```

## Route id configuration

We moved the key `routeId` inside a `metrics` object to avoid possible clashes.
Also, all the routes **without an id will be ignored**.

### V1

```js
app.get(
    {
        config: {
            routeId: 'someId',
        },
    },
    async () => {
        return { ok: true };
    }
);
```

### V2

```js
app.get(
    {
        config: {
            metrics: {
                routeId: 'someId',
            },
        },
    },
    async () => {
        return { ok: true };
    }
);
```
