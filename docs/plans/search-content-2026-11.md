# Search content research and implementation queue — November 2026

Status: research complete; briefs are ordered for implementation. Personal-site
implementation is gated by the approved-proposal contract in its repository.
Canonical owner: this document. Do not maintain a competing assistant-local plan.

Research date: 2026-11-06 Europe/Podgorica (2026-11-05 UTC). Search results are a
point-in-time sample, not a reproducible Google ranking or a search-volume study.
No search-volume, traffic-uplift, or conversion estimates have been invented.

## Evidence and its limits

The authenticated GSC domain property `sc-domain:mctl.ai` includes subdomains.
The Web (text) report for **2026-10-07–2026-11-03** showed 65 clicks, 464
impressions, 14% CTR and average position 4.6. Selected query rows:

| Query | Clicks | Impressions | CTR | Position | Interpretation |
| --- | ---: | ---: | ---: | ---: | --- |
| mctl | 0 | 86 | 0% | 5.3 | Brand/navigation; improve the existing home and resolve overlap, not another brand landing page |
| алиса mcp | 1 | 17 | 5.9% | 5.9 | Observed integration interest; the strongest specific content seed |
| seerr mcp | 0 | 4 | 0% | 8.5 | Observed but very small integration interest |
| site:docs.mctl.ai | 0 | 1 | 0% | 1.0 | Site-operator navigation, not a topic to target |
| skanect software | 0 | 1 | 0% | 1.0 | Unrelated; exclude |
| kubernetes ctl / mwctl | 0 | 1 each | 0% | 10.0 | Ambiguous strings; do not interpret as demand for MCTL |

The same window's selected Pages rows were:

| URL | Clicks | Impressions | CTR | Position |
| --- | ---: | ---: | ---: | ---: |
| https://alice.mctl.ai/ | 63 | 221 | 28.5% | 3.7 |
| https://alice.mctl.ai/setup | 5 | 52 | 9.6% | 3.8 |
| https://mctl.ai/ | 0 | 144 | 0% | 5.2 |
| https://tg.mctl.ai/ | 0 | 21 | 0% | 3.8 |
| https://tg.mctl.ai/docs | 0 | 14 | 0% | 5.4 |
| https://academy.mctl.ai/ | 1 | 9 | 11.1% | 5.8 |

Do not add these page rows to reconstruct domain totals: GSC's grouping changes
aggregation. Visible query rows are incomplete because GSC can omit queries.
Zero observed Telegram query rows is not proof of zero Telegram demand.

For `sc-domain:dmitriimashkov.com`, the same 28-day window showed **0 clicks,
22 impressions, 0% CTR and position 6.2**. Visible query rows were
`машков дмитрий телеграм` (0 clicks / 3 impressions) and
`машков телеграмм канал` (0 / 1). In the separately inspected three-month view,
there were 1 click / 41 impressions; the same queries had 5 and 3 impressions.
Do not mix the windows. These counts justify a small identity/snippet update,
not a large publishing programme or a new Telegram doorway page.

All of these dates precede the November 5 SEO deployments. There is no measured
post-release improvement yet. The mctl.ai CTR metadata PR had remained unreleased;
7.18.0 was deployed during verification. Alice 2.9.0 and Telegram 0.124.0 are also
live. Academy's noindex response headers are live; query-level redistribution is
not yet verified.

## Search-result and content inspection

The following are primary pages inspected during research. This is a sample of
results returned for the stated searches, not a claim about fixed positions:

- For `Яндекс Станция MCP Claude умный дом`, our [Alice home](https://alice.mctl.ai/)
  and [setup guide](https://alice.mctl.ai/setup) surfaced. The setup already has
  client instructions, permissions, an OAuth walkthrough and revocation. Improve
  its descriptive title and framing before creating another overlapping guide.
  Distinguish controlling a Yandex speaker/smart home from using Alice AI as an
  MCP client; those are different intents.
- For `seerr mcp server github`, projects such as
  [dlepaux/seerr-mcp](https://github.com/dlepaux/seerr-mcp) and
  [cyanheads/seerr-mcp-server](https://github.com/cyanheads/seerr-mcp-server)
  surfaced. Setup and personal-instance connection are central intents. Our
  SeerrSense differentiator is resolving natural-language descriptions to
  provider-verified media before a confirmed request, not merely exposing an API.
- For `Telegram MCP Claude connect`, our [Telegram home](https://tg.mctl.ai/),
  [LMCP's connection guide](https://admin.local-mcp.com/guides/claude-telegram),
  [WireCat's remote guide](https://wirecat.dev/en/docs/tg/remote) and
  [Chatroost's quickstart](https://mcp-telegram.com/docs/quickstart) surfaced.
  Competitors offer explicit connection-oriented entry points. A focused guide
  could help, but Telegram-specific query demand is not established by the GSC
  rows captured here. Do not invent claims about competitor security or pricing.
- A professional-name search surfaced the existing
  [personal home](https://dmitriimashkov.com/). It already contains both name
  spellings and a Person/WebSite graph with Telegram, GitHub and LinkedIn sameAs.
  Adding a second Person graph would duplicate work.

## Technical prerequisites and GSC coverage

The [Google property documentation](https://support.google.com/webmasters/answer/34592)
confirms that a domain property covers all protocols and subdomains. Thus the
existing `mctl.ai` domain property already covers all six product sites. Separate
URL-prefix properties are useful for focused reporting and permissions; creating
one is not a ranking or indexing improvement by itself. Do not sum overlapping
property reports.

Verified properties in the selector: domain `mctl.ai`, domain
`dmitriimashkov.com`, and URL-prefix `https://academy.mctl.ai/`,
`https://alice.mctl.ai/`, `https://tg.mctl.ai/`. Academy's newly added property
showed “Processing data”; this means unavailable, not zero traffic. Optional
reporting additions: `https://mctl.ai/`, `https://docs.mctl.ai/` and
`https://seerrsense.mctl.ai/`. No labs property is needed for this initiative.
Other independent registrable domains need their own verified property if they
serve distinct indexable content; do not add redirect-only domains automatically.

Live robots.txt files advertise sitemap URLs for the personal site, mctl.ai,
Alice, Telegram, Academy and Docs. The personal site's sitemap index and child
XML are public and parseable; the child has 16 URLs. GSC submission/processing
success has not been established for every property and must not be inferred
from a successful HTTP fetch.

**SeerrSense prerequisite:** its robots.txt returns 200 text/plain but has no
Sitemap directive; `/sitemap.xml` returns 401 JSON (`invalid_token`). There is no
public sitemap route in the inspected server. Add an explicit public XML route
and robots declaration before treating sitemap coverage as complete. Do not
weaken authentication on `/api`, `/mcp`, account or OAuth routes. This is a
small discovery improvement, not proof that the whole site is unindexable.

## Execution record

- Brief 1: [mctl-alice#152](https://github.com/mctlhq/mctl-alice/pull/152)
  implements the explicit setup framing, prerequisites and first read-only check.
  Merged and released as **2.10.0**. [Deployment run](https://github.com/mctlhq/mctl-gitops/actions/runs/42127450917)
  completed successfully on 2026-11-05 UTC. ArgoCD reports Synced / Healthy.
  Production `/setup` was checked: explicit Alice/Yandex Station title, the
  prerequisites and first-check sections, and `site.js?v=2.10.0` are present.
- Brief 2: [seerrsense#105](https://github.com/mctlhq/seerrsense/pull/105) adds
  the public setup guide and sitemap. Released as **1.13.0** and deployed on
  2026-11-06 UTC. Production `/setup`, `/sitemap.xml`, `/robots.txt` and `/` return
  200, the canonical is correct, and the sitemap has 5 locations. The claude.ai and
  ChatGPT click-through and the live `request_media` and `get_media` tools were not
  checked.
- Brief 5: [portfolio#195](https://github.com/mctlhq/portfolio/issues/195)
  produced the [proposal](https://github.com/mctlhq/mctl-gitops/tree/main/platform-gitops/agents-state/portfolio/proposals/issue-195-improve-home-search-snippet-and-bilingua).
  [mctl-gitops#2408](https://github.com/mctlhq/mctl-gitops/pull/2408) merged
  after green CI and a clean review. It clarifies the deployment boundary and
  avoids promised search outcomes. [Reviewed proposal revision](https://github.com/mctlhq/mctl-gitops/tree/07f8f1fa5833f52405ed6e279e14974fdb013db8/platform-gitops/agents-state/portfolio/proposals/issue-195-improve-home-search-snippet-and-bilingua).
  The owner approved it as written on 2026-11-06.
  [portfolio#196](https://github.com/mctlhq/portfolio/pull/196) implements it.
  Released as **0.1.54** on 2026-11-06 UTC. ArgoCD reports Synced / Healthy, and
  production serves the new title and description. The journal entry was closed by
  [portfolio#198](https://github.com/mctlhq/portfolio/pull/198). Search-result
  change is not yet measured.

## Ordered page briefs

### 1. Alice: improve the existing setup entry point

- Confidence: observed GSC query and existing guide impressions; highest priority.
- URL/repository: keep `https://alice.mctl.ai/setup`, `mctl-alice`.
- Audience: a Yandex speaker/smart-home owner connecting an AI assistant.
- Target intent: `алиса mcp`, connecting a Yandex Station to Claude or ChatGPT.
- Proposed RU search title/H1 direction: `Алиса MCP: подключение Яндекс Станции к Claude и ChatGPT`.
- EN direction: `Alice MCP: connect Yandex Station to Claude and ChatGPT`.
- Outline: what this connection controls; prerequisites and public endpoint;
  supported-client instructions; first read-only device-list call; choosing
  control permissions; official Smart Home API versus optional unofficial Quasar;
  troubleshooting and revoking access.
- Preserve existing client, OAuth and revocation content. Update RU/EN translations
  together; verify vendor menu paths when writing. Do not imply Yandex endorsement
  or that every speaker operation is available through the official API.
- Links: retain the home-to-setup link; link the guide back to relevant product
  capabilities and to the ecosystem block. Do not add a second near-identical URL.
- Done: static useful copy and metadata, self-canonical, sitemap inclusion,
  working internal links, and existing site/i18n checks passing.

### 2. SeerrSense: discovery prerequisite, then a setup guide

- Confidence: `seerr mcp` is observed, but only four impressions; keep scope small.
- URL/repository: public `/setup` in `seerrsense`; retain the home as the product
  overview. First implement the public sitemap prerequisite described above.
- Audience: someone with an existing Seerr/Overseerr/Jellyseerr instance.
- Search title direction: `Seerr MCP setup: connect your media requests to an AI assistant`.
- Outline: what runs on your Seerr instance and what runs here; prerequisites;
  connection and credential ownership; a read-only catalogue/status check;
  resolving an imprecise title; verifying the candidate; confirming the request;
  troubleshooting and disconnecting.
- Use synthetic media/account examples; never publish keys or imply that an LLM
  invents authoritative provider IDs. Publish only tested client instructions.
- Links: home setup summary → full guide; guide → tools/permissions/support.
- Done: sitemap GET/HEAD returns valid public XML, canonical host URLs include
  only public pages, setup content is server-rendered, private endpoints retain
  their auth behavior, and existing HTTP/security tests pass.

### 3. Telegram: a focused Claude connection guide

- Confidence: exploratory; supported by competitor entry points and our `/docs`
  impressions, not an observed Telegram query volume in the captured GSC data.
- URL/repository: proposed `https://tg.mctl.ai/docs/claude`, `mctl-telegram`.
- Audience: a Claude user who wants to work with their own Telegram account.
- Search title direction: `Connect Telegram to Claude with MCP | MCTL`.
- Outline: hosted remote connector versus Local Bridge; prerequisites;
  connection and read-only consent; first chat-list/search; permission changes;
  session storage, limits and revocation; troubleshooting.
- Reuse shared instructions or make existing `/docs` a concise summary linking
  to the guide. Do not maintain conflicting copies of menu paths.
- Explicitly distinguish access to an authorized Telegram account from a bot
  that remotely controls Claude Code. Do not claim public-directory listing.
- Done: server-rendered route, unique metadata, canonical and sitemap coverage,
  links from home/docs, and web/security/analytics tests pass.

### 4. MCTL platform: one concrete MCP deployment walkthrough

- Confidence: exploratory; no established non-brand query demand in this sample.
- URL/repository: reserve a single canonical walkthrough in `docs.mctl.ai`, linked
  from mctl.ai. Choose its exact path only after inspecting the docs information
  architecture; do not create a competing generic marketing article.
- Audience: a developer evaluating how to run their own MCP service reliably.
- Title direction: `Deploy an MCP server on Kubernetes with MCTL`.
- Outline: one supported sample repository; deployment; required secrets;
  endpoint/authentication checks; logs/health; update and rollback; cost/limits
  linked to current product terms. Include a complete reproducible example.
- Keep this behind the first three briefs unless fresh demand or product feedback
  changes the priority. Do not infer intent from the ambiguous `kubernetes ctl`
  query, promise unsupported signup access, or write generic Kubernetes filler.
- Done: verified sample and commands, current product constraints, unique
  canonical URL, and links from the platform's relevant product section.

### 5. Personal home: identity and search snippet

- Confidence: observed navigational queries, very small sample.
- URL/repository: existing `https://dmitriimashkov.com/`, `portfolio`.
- Contract: [portfolio issue #195](https://github.com/mctlhq/portfolio/issues/195).
- Scope: descriptive Latin title; shared home description copy; Cyrillic
  `Person.alternateName`; descriptive bilingual text on the existing Telegram
  contact link. Keep all existing sameAs destinations.
- No new Telegram/keyword doorway, no Russian route, no dynamic metadata and no
  tracker. Existing AGENTS.md explicitly keeps the title Latin and requires an
  approved DevLoop proposal. Human approval is required before implementation.
- Done: exact issue copy reflected in the approved proposal, existing build and
  zero-third-party checks pass, journal lifecycle is recorded, and the eventual
  deployment is performed only with mctl MCP tools.

## Measurement and next decisions

1. Record each brief's merge/release/deploy date here when implemented; do not
   call a merge a production result.
2. After Google has recrawled the affected URL and complete data is available,
   compare equal post-release and pre-release windows. Start with 7 complete
   days and review again at 28 days; report low-count uncertainty.
3. Inspect exact query + Pages for brand overlap; inspect exact page + Queries
   for content performance. Keep countries/devices/search type consistent.
4. Track the primary page's impressions, clicks and CTR, plus completion of its
   connection path where existing permitted telemetry supports that. Do not add
   analytics to the personal site.
5. Reprioritize after the first two briefs. More pages are conditional on useful
   unique content and evidence, not a target page count. Pelican/labs remains
   explicitly outside this work.

Google's [helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
supports descriptive, useful material with original value. A
[sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
helps discovery but does not guarantee indexing. Schema.org's
[alternateName](https://schema.org/alternateName) represents an alias; adding it
is an identity clarification, not a promised ranking boost.
