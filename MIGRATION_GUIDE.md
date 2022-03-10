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
