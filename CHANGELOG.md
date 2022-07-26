## [4.0.1](https://github.com/immobiliare/fastify-metrics/compare/v4.0.0...v4.0.1) (2022-07-26)


### Bug Fixes

* docs with wrong version table ([effc04f](https://github.com/immobiliare/fastify-metrics/commit/effc04fc20b5d10052ebc1cfa44e187bfa68bbb3))

# [4.0.0](https://github.com/immobiliare/fastify-metrics/compare/v3.0.1...v4.0.0) (2022-07-18)


### Features

* **fastify:** updates framework and plugin to 4.x ([6dfa740](https://github.com/immobiliare/fastify-metrics/commit/6dfa74012365fe0507b3a79a6cb89650931beb9d))


### BREAKING CHANGES

* **fastify:** fastify major update

## [3.0.1](https://github.com/immobiliare/fastify-metrics/compare/v3.0.0...v3.0.1) (2022-06-21)


### Bug Fixes

* skip getLabel on 404 ([37b6e2e](https://github.com/immobiliare/fastify-metrics/commit/37b6e2ece186bf3ccbe9e8147079c69105488f61))

# [3.0.0](https://github.com/immobiliare/fastify-metrics/compare/v2.0.2...v3.0.0) (2022-05-10)


### Features

* update node ([a52b375](https://github.com/immobiliare/fastify-metrics/commit/a52b375587c0a6dc0b9420ac185fb19e997bdf4c))


### BREAKING CHANGES

* Node.js 12 is deprecated

## [2.0.2](https://github.com/immobiliare/fastify-metrics/compare/v2.0.1...v2.0.2) (2022-03-16)


### Bug Fixes

* **types:** fix cannot cast MetricsPluginOptions properties to specific type ([956a4af](https://github.com/immobiliare/fastify-metrics/commit/956a4afcbf0532568f4f1924e2e4c8677f0acb45))

## [2.0.1](https://github.com/immobiliare/fastify-metrics/compare/v2.0.0...v2.0.1) (2022-03-16)


### Bug Fixes

* fixed types ([7ed7133](https://github.com/immobiliare/fastify-metrics/commit/7ed7133df4ed03af81cbafc94de83580663d460b))

# [2.0.0](https://github.com/immobiliare/fastify-metrics/compare/v1.0.0...v2.0.0) (2022-03-10)


### Bug Fixes

* **types:** add missing types ([74444b9](https://github.com/immobiliare/fastify-metrics/commit/74444b970dd5ab1873d7b4ba54cc1b09fbedd54f))
* check for the presence of metrics object ([288771b](https://github.com/immobiliare/fastify-metrics/commit/288771b06cc5e38da44eebc511d781359cc9f7e3)), closes [#134](https://github.com/immobiliare/fastify-metrics/issues/134)
* **label:** label with undefined id ([6d79705](https://github.com/immobiliare/fastify-metrics/commit/6d79705ec08d1f76e857a47cfbe2263006d19050))
* fix isCustomClientCheck ([ff5ffe9](https://github.com/immobiliare/fastify-metrics/commit/ff5ffe9fccd8846992c39742c10e25dc28dde887))
* remove doc decorator ([50abf07](https://github.com/immobiliare/fastify-metrics/commit/50abf07e247858dc2990c30f6886a0de4649daa2))
* upgrade fastify-plugin from 3.0.0 to 3.0.1 ([2a04a38](https://github.com/immobiliare/fastify-metrics/commit/2a04a38fe62cfe95a3e4228c5d3b3309afc04c6c))
* **dynamic mode:** fixed this context in getLabel for dynamic mode to be the request context ([0dac171](https://github.com/immobiliare/fastify-metrics/commit/0dac171fb7c3c582b213fd48bde143fb294aaceb))
* **TCP:** fixed tcp ([58690d2](https://github.com/immobiliare/fastify-metrics/commit/58690d2aa6af36d5efe171854ef9e59e320fff00))
* **types:** added missing type for FastifyContextConfig ([fa07110](https://github.com/immobiliare/fastify-metrics/commit/fa07110fafebe5374a52f5e2e1d4bec3d8ef9eab))
* **types:** fix wrong export name ([119fdc3](https://github.com/immobiliare/fastify-metrics/commit/119fdc31f2c0fde7c017340bb3cfeaaa26cac530))


### chore

* **deps:** update dats to version 2 ([03d2316](https://github.com/immobiliare/fastify-metrics/commit/03d23162e6ed390d35f9fd64d6e043a31154f878))


### Features

* add boolean to routes config ([acca747](https://github.com/immobiliare/fastify-metrics/commit/acca747b958d492b31f810cd7696d320f64dddb0))
* rename routes.timing in responseTime ([44fe70a](https://github.com/immobiliare/fastify-metrics/commit/44fe70a02dec3f9993897125021b4b883c3f1045))
* **metric:** add req/res size metric ([1f7b2a4](https://github.com/immobiliare/fastify-metrics/commit/1f7b2a4505cb20e0caadf3ecb139cba61a9756ea)), closes [#32](https://github.com/immobiliare/fastify-metrics/issues/32)
* added skip for empty ids ([cbee46b](https://github.com/immobiliare/fastify-metrics/commit/cbee46b58987e16138d617d3d9690d250def7e8c))
* allow custom Dats client ([40de470](https://github.com/immobiliare/fastify-metrics/commit/40de47026d02bc8dbb1a4c10be85cc09fc3cdad9))
* change configuration object ([df6ba44](https://github.com/immobiliare/fastify-metrics/commit/df6ba446aeef5253b13ad0340da8899f1879699b))
* decorated request and reply with get label function ([f00b9d5](https://github.com/immobiliare/fastify-metrics/commit/f00b9d5b453226fc939472e92c5199fba496b723))
* scope instance decorators ([d1331a1](https://github.com/immobiliare/fastify-metrics/commit/d1331a1da6a7e790718c5c0714ae61c1f54e70d4))
* **routes:** add normalized strings to context ([4b172d6](https://github.com/immobiliare/fastify-metrics/commit/4b172d6379b8d29a0a0bc0c16153fadeda3d6b6f))
* custom route metric label ([efe0131](https://github.com/immobiliare/fastify-metrics/commit/efe0131944d10e3ae9b9b1eecf2a938b3bd07f5f))
* expose process metrics sampler ([67b69c5](https://github.com/immobiliare/fastify-metrics/commit/67b69c584529d635738ded65e8f784e37c6fe1dd))
* prerelase ([2d0d1d0](https://github.com/immobiliare/fastify-metrics/commit/2d0d1d0fb881a073164cc26b6a353fcc94465941))


### BREAKING CHANGES

* timing is renamed to responseTime.
* The previous configuration is not supported anymore,
please check your client, routes and health configurations.
* the fastify instance decorators are exported in the `metrics` object.
The `doc` sampler instance is renamed to `sampler`.
* **deps:** there might be breaking changes in the new dats version.
* the routes metrics options have changed.
The default route prefix is now an empty string and not 'api'.
The dats instance is exported as `metricsCLient`.
* **types:** the plugin init functions have different names.

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
