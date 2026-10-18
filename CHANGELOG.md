# Changelog

## [7.11.0](https://github.com/mctlhq/mctl-web/compare/7.10.1...7.11.0) (2026-10-18)


### Features

* save invitation requests before notifying reviewers ([d83c72a](https://github.com/mctlhq/mctl-web/commit/d83c72a43f2ab29a999ede821b3886942753f815))
* save invitation requests before notifying reviewers ([61479a8](https://github.com/mctlhq/mctl-web/commit/61479a85b36bc72c3b081fed2de97edf0eaf7b96))


### Bug Fixes

* preserve legacy sessions in invitation entry ([8b9d271](https://github.com/mctlhq/mctl-web/commit/8b9d27134c4f9d15479015da4f401c9ae92c5ff5))
* preserve live identity when switching invitation forms ([a0bdfe9](https://github.com/mctlhq/mctl-web/commit/a0bdfe9e6dd2226f4c608824237ed44099940ed3))
* recover invitation delivery scans without hiding errors ([58466fd](https://github.com/mctlhq/mctl-web/commit/58466fdbc2f4cbb64a549f74331ba4f8d680a574))
* retain invitation sign-in feedback and recover invalid cursors ([a5984b1](https://github.com/mctlhq/mctl-web/commit/a5984b177a602ac187a60b8c538428d710e0b088))


### Documentation

* close production MCP deletion acceptance ([76c187a](https://github.com/mctlhq/mctl-web/commit/76c187a8bd2fd85c90a8d186c27d31a89f8ee029))
* close production MCP deletion acceptance ([1922b80](https://github.com/mctlhq/mctl-web/commit/1922b804bc006b6b36fac6fa27df284615624136))
* record customer deletion review and remaining rollout ([acae034](https://github.com/mctlhq/mctl-web/commit/acae03476a27ad8e56dbeea291f56a8ff67bea18))
* record customer deletion review and remaining rollout ([9a9033c](https://github.com/mctlhq/mctl-web/commit/9a9033c506dcb19f01576efcb0a35f24871d3c82))
* record deletion cancellation and portal rollout ([c924e5a](https://github.com/mctlhq/mctl-web/commit/c924e5aa15e17ec1e017a4af0de770f2bd43f149))
* record deletion cancellation and portal rollout ([218da17](https://github.com/mctlhq/mctl-web/commit/218da173ba108d4fd750d47ff4d21c4b49b909aa))
* record portal cleanup and deletion rollout gates ([51b48f1](https://github.com/mctlhq/mctl-web/commit/51b48f1c0544ecff6f285abf74f67ff2e108bd4d))
* record portal cleanup and deletion rollout gates ([fe0c9e0](https://github.com/mctlhq/mctl-web/commit/fe0c9e091c648826db4991a0341f0ee07e5e9afb))

## [7.10.1](https://github.com/mctlhq/mctl-web/compare/7.10.0...7.10.1) (2026-10-18)


### Bug Fixes

* drop transitional port 80, restore build-time nginx -t ([9017c22](https://github.com/mctlhq/mctl-web/commit/9017c223fff2f629d6e0bbe77348321e6f65e9f5))
* drop transitional port 80, restore build-time nginx -t ([0a9fc19](https://github.com/mctlhq/mctl-web/commit/0a9fc19ac9eedd925492c9f34e679fdccdc3958c))

## [7.10.0](https://github.com/mctlhq/mctl-web/compare/7.9.0...7.10.0) (2026-10-17)


### Features

* revoke customer sessions through a pinned machine endpoint ([8de2c38](https://github.com/mctlhq/mctl-web/commit/8de2c384996dbbcf45145ff8b17f1dbac25f123d))
* revoke customer sessions through a pinned machine endpoint ([821fe42](https://github.com/mctlhq/mctl-web/commit/821fe42ae50e66205bff9834ac73fe99971c3e40))
* run the image as non-root on nginx-unprivileged ([3feaada](https://github.com/mctlhq/mctl-web/commit/3feaada7802a7a35678325b660ab35cfd36c4eb9))
* run the image as non-root on nginx-unprivileged ([d4e1f19](https://github.com/mctlhq/mctl-web/commit/d4e1f1925c0c43fdd0ba7864b62ad15e3423a1d6))


### Bug Fixes

* expose both ports while nginx still listens on 80 ([d878b15](https://github.com/mctlhq/mctl-web/commit/d878b158d1dbf55174c72b925ca1e99d24da2e25))
* preserve revocation progress across large session scans ([e4f53c1](https://github.com/mctlhq/mctl-web/commit/e4f53c1950807c03c55db4eff88944e8448fbf59))


### Documentation

* correct workflow namespace in signup baseline ([cce083a](https://github.com/mctlhq/mctl-web/commit/cce083a58b8085f7049221a716d7369217a58781))
* plan post-acceptance onboarding stages ([097f8b8](https://github.com/mctlhq/mctl-web/commit/097f8b854953dd9c0d844485b69bea0c6d869603))
* plan post-acceptance onboarding stages ([6c59211](https://github.com/mctlhq/mctl-web/commit/6c592112ee3468495899948620effe70c5f354c8))
* record onboarding production acceptance ([b6f8b06](https://github.com/mctlhq/mctl-web/commit/b6f8b06803d6de60dab27d9089c3fdf8c9616a0b))
* record onboarding production acceptance ([d708b79](https://github.com/mctlhq/mctl-web/commit/d708b793e9462da048b00795482b51174281af4f))
* record signup capacity and mutation check evidence ([ec00542](https://github.com/mctlhq/mctl-web/commit/ec00542ccd1d35e047981378f6af37e61dc32898))
* track complete customer deletion through MCP ([66fa007](https://github.com/mctlhq/mctl-web/commit/66fa007622d82dd7ba0fe1a0d5182a9fd0fb0464))
* track complete customer deletion through MCP ([f6c3f49](https://github.com/mctlhq/mctl-web/commit/f6c3f496b8d23d262c877437c0e36eb050ae4e01))

## [7.9.0](https://github.com/mctlhq/mctl-web/compare/7.8.1...7.9.0) (2026-10-17)


### Features

* explain the verified workspace-ready follow-up ([599dbdd](https://github.com/mctlhq/mctl-web/commit/599dbddaea3a29e71029f128f39dac26c6ec171a))
* explain verified workspace-ready follow-up ([0ee8ec8](https://github.com/mctlhq/mctl-web/commit/0ee8ec8d84634a8c0a4d44384f30f9eca124ca4b))


### Documentation

* record live customer MCP acceptance and cutover decision ([2537727](https://github.com/mctlhq/mctl-web/commit/2537727e239a727a70c44abd3247ebcf227d761c))
* record live workspace and portal acceptance ([cdc748f](https://github.com/mctlhq/mctl-web/commit/cdc748f7894f3aee2cce59fbe21f28fd7f4ed235))
* record live workspace and portal acceptance ([1d3f2a9](https://github.com/mctlhq/mctl-web/commit/1d3f2a9ef475e685407d03b0cc39fd227d9a9e29))
* replace the superseded principal launch dependency ([acb8533](https://github.com/mctlhq/mctl-web/commit/acb8533d8390de34452fb40ab2d0566e8d43f817))

## [7.8.1](https://github.com/mctlhq/mctl-web/compare/7.8.0...7.8.1) (2026-10-17)


### Bug Fixes

* acknowledge requests and correct notification links ([c0d9a7d](https://github.com/mctlhq/mctl-web/commit/c0d9a7df56320e5887c68f5ebf19f3778109a0ac))
* acknowledge workspace requests and correct notification links ([4b7b43e](https://github.com/mctlhq/mctl-web/commit/4b7b43ec13884028a036ee58504ebc6b740afc90))
* preserve drafts during initial session lookup ([d6eb595](https://github.com/mctlhq/mctl-web/commit/d6eb595408881268ff1494f0dbc13466f5556c24))


### Documentation

* reconcile onboarding rollout and acceptance status ([be90213](https://github.com/mctlhq/mctl-web/commit/be902130a3798d350fc0dfbbc688b6fdd7605f0e))
* reconcile onboarding rollout and acceptance status ([34ddb92](https://github.com/mctlhq/mctl-web/commit/34ddb92b94b36473762b64a24e3321881f8e1558))
* record customer rollout and live acceptance boundaries ([4e47a85](https://github.com/mctlhq/mctl-web/commit/4e47a85d717fb7104c83c83539dcf354f69c9126))
* record customer rollout and live acceptance boundaries ([cb862d7](https://github.com/mctlhq/mctl-web/commit/cb862d7ca5be4d58c4ea9ff36dde3fdbecca5e79))
* record the principal-mode gate for public onboarding ([cac6efc](https://github.com/mctlhq/mctl-web/commit/cac6efc31a0646c0cd38f86f7939b110b116061b))
* record the principal-mode gate for public onboarding ([d71c4d8](https://github.com/mctlhq/mctl-web/commit/d71c4d81ea8bcf7d658923859cf4ef2dced2088d))

## [7.8.0](https://github.com/mctlhq/mctl-web/compare/7.7.1...7.8.0) (2026-10-16)


### Features

* **auth:** ZITADEL sign-in UI behind the auth_flow switch ([a259238](https://github.com/mctlhq/mctl-web/commit/a25923865127e51d6673d5f6cf90337c80bddbad))
* **auth:** ZITADEL sign-in UI behind the auth_flow switch ([d08e910](https://github.com/mctlhq/mctl-web/commit/d08e91023364bc366f18f1c0cc29c753b2793388))
* **worker:** ZITADEL sign-in with server-side sessions ([3db9c1a](https://github.com/mctlhq/mctl-web/commit/3db9c1abbcd46c499a15036d37de6cfcf3cae548))
* **worker:** ZITADEL sign-in with server-side sessions ([baa77a4](https://github.com/mctlhq/mctl-web/commit/baa77a433d6d6574d6daa34f9da709faa779fdd0))


### Bug Fixes

* **auth:** address C1b review findings ([abe3864](https://github.com/mctlhq/mctl-web/commit/abe3864473884dae2f2acad054e6d049865a42cc))
* **auth:** end a session only when one can exist, and only on a 2xx ([e8dba1f](https://github.com/mctlhq/mctl-web/commit/e8dba1fc534a71258abfa24bce34db6d0f5a3cbc))
* **worker:** address C1a review findings ([6d486e4](https://github.com/mctlhq/mctl-web/commit/6d486e4fcfebdf0f44350079079b1ee0ad7e2de8))
* **worker:** keep a rate-limited callback on the site, log refusal codes ([6909cac](https://github.com/mctlhq/mctl-web/commit/6909cacffbea30d977dbfdc482b1976d93aefa06))

## [7.7.1](https://github.com/mctlhq/mctl-web/compare/7.7.0...7.7.1) (2026-10-16)


### Bug Fixes

* adopt design 0.7 and simplify site styling ([d649e93](https://github.com/mctlhq/mctl-web/commit/d649e934503f92d2e66a618927dae26af499b9b2))
* adopt design 0.7 and simplify site styling ([35fbe48](https://github.com/mctlhq/mctl-web/commit/35fbe48dc5976bab61cd747d4fd5a1a8d0f17c5e))

## [7.7.0](https://github.com/mctlhq/mctl-web/compare/7.6.2...7.7.0) (2026-10-16)


### Features

* adopt shared public site typography and colors ([37e7bbf](https://github.com/mctlhq/mctl-web/commit/37e7bbfd547a5ed391a159aedae30eafcb593263))
* use shared public site shell tokens ([e60eac9](https://github.com/mctlhq/mctl-web/commit/e60eac9b90ed85665cc8c15e0397e54888c9065f))
* use shared typography and semantic colors across site ([6def1b0](https://github.com/mctlhq/mctl-web/commit/6def1b053b86367f654732b191ea7ac98d85122b))


### Bug Fixes

* center header wordmark without baseline offset ([62718ed](https://github.com/mctlhq/mctl-web/commit/62718ed262edfbfe883edf627241d2c204bfb1e2))
* preserve site styles when design CDN is unavailable ([610f27b](https://github.com/mctlhq/mctl-web/commit/610f27b60140548e48ec0be03b050c4691efdd7a))


### Documentation

* **plan:** record owner sign-off on B1 shape after B0 ([517d888](https://github.com/mctlhq/mctl-web/commit/517d8887334ba6b13bce1ccb6ba5fd927f44eec4))
* **plan:** record owner sign-off on B1 shape after B0 ([6dc171d](https://github.com/mctlhq/mctl-web/commit/6dc171d07eeb46de42d6373284d1cf55c815902f))
* **plan:** record phase 0 local identity hook validation ([d312308](https://github.com/mctlhq/mctl-web/commit/d312308c4016cadc99ba0accfb589cbb81136786))
* **plan:** record phase 0 local identity hook validation ([8eabd70](https://github.com/mctlhq/mctl-web/commit/8eabd70a065f805e388f29a57bdb9204ac8a70e8))
* **plans:** record B0 spike results for stage B ([7f779f0](https://github.com/mctlhq/mctl-web/commit/7f779f0df9ae15f44bd75a9ace9ba4871756464d))
* **plans:** record B0 spike results for stage B ([d96377b](https://github.com/mctlhq/mctl-web/commit/d96377b006565bc0374c2a2dd940fdf7d7f727aa))

## [7.6.2](https://github.com/mctlhq/mctl-web/compare/7.6.1...7.6.2) (2026-10-15)


### Bug Fixes

* **worker:** refuse a primary verified email without an @ at sign-in ([6ef3113](https://github.com/mctlhq/mctl-web/commit/6ef3113358bc878c46b17e4e2d4afa933b1a7d36))
* **worker:** sign the whole GitHub identity and expire it ([a5749d4](https://github.com/mctlhq/mctl-web/commit/a5749d45e179473f9c924bb1d2c93e8a74b0ae12))


### Documentation

* **plan:** customer access scope, ready email and grants stage ([1c6e0bd](https://github.com/mctlhq/mctl-web/commit/1c6e0bd3a33dc0d9cf4b31a9935bacd08ae58e8a))
* **plan:** customer access scope, ready email and grants stage ([ade4773](https://github.com/mctlhq/mctl-web/commit/ade477360c5886bfc1aaf14b5b525f845f1c42c5))
* **plan:** principal-keyed example, readiness check, revocation bound ([653710c](https://github.com/mctlhq/mctl-web/commit/653710cb9d04bd1107c44f62f65f425e149be92d))

## [7.6.1](https://github.com/mctlhq/mctl-web/compare/7.6.0...7.6.1) (2026-10-15)


### Bug Fixes

* **auth:** persist the identity and clear the auth fragment for real ([f5db103](https://github.com/mctlhq/mctl-web/commit/f5db1038c89346e458db24dabfa8afc6f465ae2c)), closes [#133](https://github.com/mctlhq/mctl-web/issues/133)
* **auth:** send the signed GitHub identity back unchanged ([598cf93](https://github.com/mctlhq/mctl-web/commit/598cf93157ea6103671292316ebf04e0b5131d9c))
* **auth:** send the signed GitHub identity back unchanged ([f4e093d](https://github.com/mctlhq/mctl-web/commit/f4e093d4c3e4f3e73c8b821877473148148288b2)), closes [#133](https://github.com/mctlhq/mctl-web/issues/133)


### Documentation

* **auth:** state that the earlier of the two expiries decides ([ac17fc9](https://github.com/mctlhq/mctl-web/commit/ac17fc962cac3f4f83f7a71ca5a4b14f3f119cbb))
* **plans:** make B0 the gate for isolation and fresh identity data ([5b96b64](https://github.com/mctlhq/mctl-web/commit/5b96b64bba25a16ff202d04db81a4466a7a6c7b7))
* **plans:** stage A done, prepare stage B for ZITADEL Login V2 ([6d7dd1f](https://github.com/mctlhq/mctl-web/commit/6d7dd1fea866916fed011a4d042efcce15d81e68))
* **plans:** stage A done, prepare stage B for ZITADEL Login V2 ([2fe2a4d](https://github.com/mctlhq/mctl-web/commit/2fe2a4d21aa7283e7b617942947234d2c0603020))
* **plans:** tighten B0 spike to the real Login V2 paths ([862b01b](https://github.com/mctlhq/mctl-web/commit/862b01bd7c25d72fc8176874233345a28cefa560))

## [7.6.0](https://github.com/mctlhq/mctl-web/compare/7.5.6...7.6.0) (2026-10-14)


### Features

* **forms:** success state, accepted-only status, Turnstile, styles ([79ab247](https://github.com/mctlhq/mctl-web/commit/79ab247e54713a6958c8c83215fb2d364fce0bbb))
* **forms:** success state, accepted-only status, Turnstile, styles ([8afad47](https://github.com/mctlhq/mctl-web/commit/8afad47c0f4333756253d0481fdb5ee8963d14ef))
* **worker:** welcome email redesign and provider status ([544ebad](https://github.com/mctlhq/mctl-web/commit/544ebad678e8a8b65c21f9d756378c37ecf748c7))
* **worker:** welcome email redesign and provider status ([4a26913](https://github.com/mctlhq/mctl-web/commit/4a26913d34b34be6f5c287003aacb105eecdbe42))


### Bug Fixes

* **content:** align site copy with verified platform behavior ([369179a](https://github.com/mctlhq/mctl-web/commit/369179a2f284c032fec265e15084730059b71296))
* **content:** align site copy with verified platform behavior (onboarding review A1) ([1963ae6](https://github.com/mctlhq/mctl-web/commit/1963ae6182384bf6ecc6ca00f4890bad84428567))
* **content:** drop self-service MCTL account sign-in claims ([0727ec7](https://github.com/mctlhq/mctl-web/commit/0727ec71b0a2a7d3cbb2415b78c300d5651f7de0))
* **forms:** modal contact link, verification copy, banner lifecycle ([eaa2617](https://github.com/mctlhq/mctl-web/commit/eaa2617a0ba53e842e6c19c1b38a42debb0889b2))
* **forms:** verification line defers to the notice and self-clears ([d9968a5](https://github.com/mctlhq/mctl-web/commit/d9968a5cb9e4ec842ab276f2d4f3102f18efa16e))
* **worker:** Outlook card width, drop dead email status arm ([5411bd4](https://github.com/mctlhq/mctl-web/commit/5411bd455f12ccb090aa214a4ae504cf26ca0b7e))


### Documentation

* add site onboarding review and claims register ([484d6ab](https://github.com/mctlhq/mctl-web/commit/484d6aba5fcbc6cb946e6f2bd114c91559c40864))

## [7.5.6](https://github.com/mctlhq/mctl-web/compare/7.5.5...7.5.6) (2026-10-10)


### Bug Fixes

* **worker:** stop handing GitHub tokens to docs and MCP clients ([c2750f1](https://github.com/mctlhq/mctl-web/commit/c2750f13a8f2ac638ac8df82dabab43d3af2af5e))
* **worker:** stop handing GitHub tokens to docs and MCP clients ([a076534](https://github.com/mctlhq/mctl-web/commit/a07653439154ac4ff3f2b5a8e123d15d122f5233))

## [7.5.5](https://github.com/mctlhq/mctl-web/compare/7.5.4...7.5.5) (2026-10-07)


### Bug Fixes

* **deps:** bump shell-quote to 1.12.0 for CVE-2026-102422 ([047f7e7](https://github.com/mctlhq/mctl-web/commit/047f7e7b6104d2a8f6447389d9f3e73541c5cce5))
* **deps:** bump shell-quote to 1.12.0 for CVE-2026-102422 ([f8db9ac](https://github.com/mctlhq/mctl-web/commit/f8db9ac947b954aeef4352e525157d5ffa3e631e))
* **worker:** retire the unused mcp and tg-mcp login flows ([36a170e](https://github.com/mctlhq/mctl-web/commit/36a170e59bfc692b83e72c404692c863c0f6ac2a))
* **worker:** retire the unused mcp and tg-mcp login flows ([aedc909](https://github.com/mctlhq/mctl-web/commit/aedc909a4e1f2c5596c011180c59f453ae9dc88e))

## [7.5.4](https://github.com/mctlhq/mctl-web/compare/7.5.3...7.5.4) (2026-10-06)


### Bug Fixes

* **deps:** update svgo and other dependencies trivy flags ([5ca46c9](https://github.com/mctlhq/mctl-web/commit/5ca46c94036753c6624b66018a7fe06c2a293f04))
* **deps:** update svgo to clear CVE-2026-84370 ([cd6176e](https://github.com/mctlhq/mctl-web/commit/cd6176e12a563be97f76ec618dde999406adec26)), closes [#119](https://github.com/mctlhq/mctl-web/issues/119)
* **deps:** update the other dependencies trivy flags ([c98dad0](https://github.com/mctlhq/mctl-web/commit/c98dad08b7b0dc4d5125c55d1f25c51cd2617117))
* stop the indexing losses Search Console reports for mctl.ai ([d6153ee](https://github.com/mctlhq/mctl-web/commit/d6153ee1eba0fc7c42eac4473c1cf6f5a8eaed86))
* stop the indexing losses Search Console reports for mctl.ai ([ed6373a](https://github.com/mctlhq/mctl-web/commit/ed6373ab23de1260823f2665fac7e3cffac2f337))


### Documentation

* README describes the 404 behaviour, not the SPA fallback ([f06ca63](https://github.com/mctlhq/mctl-web/commit/f06ca638e8363f913491d3429d929b88a10fd02c))

## [7.5.3](https://github.com/mctlhq/mctl-web/compare/7.5.2...7.5.3) (2026-09-04)


### Bug Fixes

* **ci:** stop grep -qv inverting the build decision, and keep paths literal ([3ec4c68](https://github.com/mctlhq/mctl-web/commit/3ec4c68647c4b1ca66fbe779ae41307dd2de3db4))
* **release:** open release PRs with an App token, not GITHUB_TOKEN ([1a1b118](https://github.com/mctlhq/mctl-web/commit/1a1b118c75bdf95ab7fcce275cbf15728b93db9a))
* **release:** open release PRs with an App token, not GITHUB_TOKEN ([ac28403](https://github.com/mctlhq/mctl-web/commit/ac28403b430d62cd00d2705a19030634ebfae27a))
* resolve QA findings on homepage ([b6e46a2](https://github.com/mctlhq/mctl-web/commit/b6e46a29d468bf1175f28a7700658706e952906d))
* **worker:** allowlist Sec-Fetch-Site before it reaches the rate-limit key ([90c726e](https://github.com/mctlhq/mctl-web/commit/90c726ecfcc69cb7ab4410765e608dc158d730ba))
* **worker:** bucket the rate limiter by request initiator, not just method ([3f20adb](https://github.com/mctlhq/mctl-web/commit/3f20adb5202e044498a3709019597ee92e7c3aac))
* **worker:** key the rate limiter by method as well as path ([5e0cf58](https://github.com/mctlhq/mctl-web/commit/5e0cf589ff0557fc189b42c5f5342ff594f4f731))


### Documentation

* merge commits, not squash, in CONTRIBUTING ([0376686](https://github.com/mctlhq/mctl-web/commit/0376686ee669e696892e7e6aa46d9fc0b4d639d9))
* merge commits, not squash, in CONTRIBUTING ([00b66ca](https://github.com/mctlhq/mctl-web/commit/00b66ca062bd8b8f4898c2d8f7dba53dc433eb0d))
* **worker:** split the rateBucket comment, and drop a claim it contradicted ([0544543](https://github.com/mctlhq/mctl-web/commit/05445431b7995d22382e76b63dd1c305178ec8f9))


### Dependencies

* bump sass from 1.102.0 to 1.103.1 ([0534e9c](https://github.com/mctlhq/mctl-web/commit/0534e9c812e5d0d7878446dadb64dd26b0b0f4c9))
* bump vite-svg-loader from 5.1.1 to 5.1.2 ([fc57f07](https://github.com/mctlhq/mctl-web/commit/fc57f07b63c03d34f212f1f2bc93662bc7cd66b1))
* bump vue-router from 5.2.0 to 5.3.0 ([9e64935](https://github.com/mctlhq/mctl-web/commit/9e6493575125b0bc5d07ff2cfc35d93ab3fb1c28))
* bump wrangler from 4.123.0 to 4.127.1 ([83843e2](https://github.com/mctlhq/mctl-web/commit/83843e2640f0aa91d1b166db7205316b942241e8))

## [7.5.2](https://github.com/mctlhq/mctl-web/compare/7.5.1...7.5.2) (2026-09-01)


### Bug Fixes

* restore GITOPS_TOKEN and update docs ([7506d09](https://github.com/mctlhq/mctl-web/commit/7506d09b565d887d5028bf06161cfa4032ab2e12))
* **turnstile-worker:** a superseded availability check must write nothing ([a787d4a](https://github.com/mctlhq/mctl-web/commit/a787d4ac1b271047f5ddbe065d48225303736f2d))
* **turnstile-worker:** clear the pending debounce before a direct availability check ([95dd1c8](https://github.com/mctlhq/mctl-web/commit/95dd1c8a5dcdf35a9edd9eca06773c27cedaaf36))
* **turnstile-worker:** exempt the shim from the rate limit, and surface 400 wrong-format ([4f5e5f9](https://github.com/mctlhq/mctl-web/commit/4f5e5f9a846671fa520976ee48a9f0063c47da72))
