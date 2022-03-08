# Fixtures

In this folder we export a mock module for `statsd` that you can use however you want.

The `statsd.js` is a module that exports a `tcp` and `udp` mock that can be used programmatically in your code (that is the strategy used in the code examples), as well as super simple cli command to run one of these mocks in a separate process.

## Code usage

```js

```

## CLI usage

> The cli mock just dumps on the cosole all the metrics received.

```bash
# launch a udp mock listening on port 10000
$ node ./examples/fixtures/statsd.js

# launch a udp mock listening on port 10000
$ node ./examples/fixtures/statsd.js -u

# launch a udp mock listening on port 2000
$ node ./examples/fixtures/statsd.js -u -p 2000

# launch a tcp mock listening on port 10000
$ node ./examples/fixtures/statsd.js -t

# launch a tcp mock listening on port 2000
$ node ./examples/fixtures/statsd.js -t -p 2000

```
