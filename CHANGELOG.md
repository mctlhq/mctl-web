# Changelog

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
