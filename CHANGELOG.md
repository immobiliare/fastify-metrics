# [2.0.0-next.3](https://github.com/immobiliare/fastify-metrics/compare/v2.0.0-next.2...v2.0.0-next.3) (2022-02-16)


### Bug Fixes

* **dynamic mode:** fixed this context in getLabel for dynamic mode to be the request context ([0dac171](https://github.com/immobiliare/fastify-metrics/commit/0dac171fb7c3c582b213fd48bde143fb294aaceb))

# [2.0.0-next.2](https://github.com/immobiliare/fastify-metrics/compare/v2.0.0-next.1...v2.0.0-next.2) (2022-02-11)


### Bug Fixes

* **types:** added missing type for FastifyContextConfig ([fa07110](https://github.com/immobiliare/fastify-metrics/commit/fa07110fafebe5374a52f5e2e1d4bec3d8ef9eab))

# [2.0.0-next.1](https://github.com/immobiliare/fastify-metrics/compare/v1.0.0...v2.0.0-next.1) (2022-02-10)


### Bug Fixes

* **TCP:** fixed tcp ([58690d2](https://github.com/immobiliare/fastify-metrics/commit/58690d2aa6af36d5efe171854ef9e59e320fff00))
* **types:** fix wrong export name ([119fdc3](https://github.com/immobiliare/fastify-metrics/commit/119fdc31f2c0fde7c017340bb3cfeaaa26cac530))


### Features

* allow custom Dats client ([40de470](https://github.com/immobiliare/fastify-metrics/commit/40de47026d02bc8dbb1a4c10be85cc09fc3cdad9))
* custom route metric label ([efe0131](https://github.com/immobiliare/fastify-metrics/commit/efe0131944d10e3ae9b9b1eecf2a938b3bd07f5f))
* expose process metrics sampler ([67b69c5](https://github.com/immobiliare/fastify-metrics/commit/67b69c584529d635738ded65e8f784e37c6fe1dd))
* prerelase ([2d0d1d0](https://github.com/immobiliare/fastify-metrics/commit/2d0d1d0fb881a073164cc26b6a353fcc94465941))


### BREAKING CHANGES

* the routes metrics options have changed.
The default route prefix is now an empty string and not 'api'.
The dats instance is exported as `metricsCLient`.
* **types:** the plugin init functions have different names.

# 1.0.0 (2021-11-05)


### Bug Fixes

* adds configuration for releasing ([64f4827](https://github.com/immobiliare/fastify-metrics/commit/64f48277488d4ae6175225b69f023b6b3a6ad8ec)), closes [#20](https://github.com/immobiliare/fastify-metrics/issues/20)
* missing npm install in ci ([784d3c0](https://github.com/immobiliare/fastify-metrics/commit/784d3c064f17488ec9ba1fe7aec070e6e787fda6))
* removes lockfile ([465da0a](https://github.com/immobiliare/fastify-metrics/commit/465da0ad8a3ec33e25d7b31009a8c4d09c3dfc6d))


### Features

* **dats:** converted afterSend into onError function ([d010e70](https://github.com/immobiliare/fastify-metrics/commit/d010e704dd6797233f85ad60393c85cb3b23c868))
