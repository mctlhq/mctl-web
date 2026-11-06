# SEO session report and handoff to Claude — 2026-11-06

Prepared for the operator to hand to Claude. This is a session record and restart
context, not a second content roadmap. The canonical research and implementation
queue remains [Search content research — November 2026](../plans/search-content-2026-11.md).
Read that document before selecting or changing a content brief.

Workspace: `/Users/dmitriimashkov/PycharmProjects/mctlhq`.
Session work ran on November 5 UTC / November 6 Europe/Podgorica.
Service and proposal status below was rechecked at **2026-11-06 08:02 UTC**.
GSC numbers were collected during the preceding session and have **not** been
refreshed on the morning of November 6.

## Operator intent and current boundary

The operator asked to improve ecosystem SEO, then authorized releases and GSC
verification, then content research and personal-site SEO. Pelican/labs indexing
is explicitly the **lowest priority**. The latest request is to prepare this
report/handoff for Claude; it is not approval of the pending portfolio proposal.

Content research is committed. Its first Alice brief is deployed. The personal
site's change has a reviewed proposal and a live DevLoop, but **no human approval
has been received in this conversation and implementation has not started**.
Do not infer approval from “do points 3 and 4” or from this handoff request.

## Shipped work

| Repository | PR | Result |
| --- | --- | --- |
| mctl-alice | [#150](https://github.com/mctlhq/mctl-alice/pull/150) | Bilingual contextual ecosystem section linking Telegram MCP, MCTL and platform docs; merged 2026-11-05 22:28 UTC |
| mctl-alice | [#151](https://github.com/mctlhq/mctl-alice/pull/151) | Release 2.9.0; aligned package/lock versions and asset cache key, and recorded the previous 2.8.0 crawler fix |
| mctl-telegram | [#1131](https://github.com/mctlhq/mctl-telegram/pull/1131) | Visible platform/docs links in the developer reference; merged 22:33 UTC |
| mctl-telegram | [#1117](https://github.com/mctlhq/mctl-telegram/pull/1117) | Existing release-please PR merged to release 0.124.0, including #1131 |
| mctl-web | [#213](https://github.com/mctlhq/mctl-web/pull/213) | Existing release-please PR merged to release 7.18.0 and actually ship SEO PR #221 |
| mctl-web | [#222](https://github.com/mctlhq/mctl-web/pull/222) | Canonical research, five ordered page briefs, evidence and root AGENTS.md discovery link; merged |
| mctl-alice | [#152](https://github.com/mctlhq/mctl-alice/pull/152) | First research brief: explicit Alice/Yandex Station setup title, RU/EN prerequisites and a first read-only device-list check; release 2.10.0, merged 23:09 UTC |
| mctl-gitops | [#2408](https://github.com/mctlhq/mctl-gitops/pull/2408) | Reviewed amendments to portfolio #195 proposal: MCP-only deployment, no promised search outcome, detector mutation proof, no unmeasured byte estimate; this did not approve it |

All listed implementation/documentation PRs passed their CI and review gates
before merging; current-head reviews were checked. Merges used merge commits.
The release-please exception was used for Telegram's release PR when the normal
merge refused the out-of-date release branch. No direct main commits were made.
No unrelated dependency PRs were merged.

### Production verification

| Service | Current image | Platform status | Verified behavior |
| --- | --- | --- | --- |
| labs/mctl-alice | 2.10.0 | Synced / Healthy | `/` contains ecosystem section; `/setup` has explicit Alice/Yandex Station title, prerequisites and first-check sections; `site.js?v=2.10.0` |
| labs/mctl-telegram | 0.124.0 | Synced / Healthy | `/docs` contains “Deploying your own services?” and platform documentation links |
| admins/mctl-web | 7.18.0 | Synced / Healthy | mctl.ai serves the new GitOps Kubernetes/AI title and GitOps/Vault/MCP description |

Successful centralized deployment runs:

- [Alice 2.9.0](https://github.com/mctlhq/mctl-gitops/actions/runs/42124004895)
- [Telegram 0.124.0](https://github.com/mctlhq/mctl-gitops/actions/runs/42123804842)
- [MCTL web 7.18.0](https://github.com/mctlhq/mctl-gitops/actions/runs/42124274706)
- [Alice 2.10.0](https://github.com/mctlhq/mctl-gitops/actions/runs/42127450917)

Important correction to the incoming handoff: mctl-web #221 had been merged but
was still unreleased. Production initially ran 7.17.0 and served the old title.
This session released 7.18.0 and verified the new HTML. Do not date the start of
its production SEO effect from the earlier merge alone.

mctl-web's platform config lists `mctl.ru` as its host even though the public
canonical is `https://mctl.ai/`. This is the existing alias setup, not proof that
mctl.ai is absent. Some platform reads briefly showed the previous image tag
during rollout; final image/config and HTTP checks agreed.

### Validation performed

- Alice: existing i18n coverage tests (2 passed), TypeScript typecheck,
  production build, JavaScript syntax and diff checks; GitHub CI exercised
  the full existing HTTP/site suite.
- Telegram: `go test ./internal/web` and `go vet ./internal/web` locally; full
  GitHub build, race tests, cross-platform builds and review gates passed.
- Research/proposal docs: reviewed source evidence and exact proposal contract,
  diff checks, repository CI and review.
- Final HTTP checks confirmed all three production changes. No new tracker or
  GA4 was introduced.

## Search Console findings

The currently available GSC tool set did not expose the handoff's claimed
`site_snapshot` / `cannibalization_check` tools. Reports were read through the
operator's authenticated Chrome session. Re-discover available tools in the new
session rather than assuming those names exist.

### MCTL domain baseline

Property: `sc-domain:mctl.ai`, Web (text), **2026-10-07–2026-11-03**:
65 clicks, 464 impressions, 14% CTR, average position 4.6. This includes subdomains.

Selected rows:

| View | Item | Clicks | Impressions | CTR | Position |
| --- | --- | ---: | ---: | ---: | ---: |
| Pages | https://mctl.ai/ | 0 | 144 | 0% | 5.2 |
| Pages | https://alice.mctl.ai/ | 63 | 221 | 28.5% | 3.7 |
| Pages | https://alice.mctl.ai/setup | 5 | 52 | 9.6% | 3.8 |
| Pages | https://tg.mctl.ai/ | 0 | 21 | 0% | 3.8 |
| Pages | https://tg.mctl.ai/docs | 0 | 14 | 0% | 5.4 |
| Pages | https://academy.mctl.ai/ | 1 | 9 | 11.1% | 5.8 |
| Queries | mctl | 0 | 86 | 0% | 5.3 |
| Queries | алиса mcp | 1 | 17 | 5.9% | 5.9 |
| Queries | seerr mcp | 0 | 4 | 0% | 8.5 |

Do not sum page rows to reconstruct domain totals; GSC aggregation differs.
Visible query rows are incomplete, not an exhaustive search-volume dataset.
Do not mix this window with the earlier handoff or the three-month view (74
clicks / 663 impressions / 11.2% CTR / position 4.7).

### Personal-site baseline

Property: `sc-domain:dmitriimashkov.com`, same 28-day window:
0 clicks, 22 impressions, 0% CTR, average position 6.2. Visible queries:
`машков дмитрий телеграм` (0 clicks / 3 impressions) and
`машков телеграмм канал` (0 / 1).

The separately inspected three-month view showed 1 click / 41 impressions;
those query rows had 5 and 3 impressions. The portfolio issue cites that
three-month evidence. Both are valid observations of different windows.
The overview showed 1 indexed and 18 non-indexed URLs, but the reasons were
not inspected; do not label all 18 as defects. Some journal noindex decisions
are deliberate.

### What remains unproven

All captured reporting dates precede the November 5 changes. There is no
measured post-release CTR uplift or query redistribution yet. The exact `mctl`
query's per-page overlap report was opened, but its table could not be captured
reliably. Academy disappearance from search is **not verified**.

Live Academy checks did confirm HTTP 200 with `X-Robots-Tag: noindex, follow`
on `/mock`, `/dashboard`, `/mistakes`, `/admin`. Sitemap lists `/` and
`/practice`; robots permits crawling `/mock` and `/dashboard`. Treat response
headers and actual Google index state as separate observations.

For follow-up measurement, read the canonical plan's measurement section. Align
property, exact URL/query, search type and equal date windows. Start with 7
complete post-release days and revisit at 28 days after recrawl; small counts
need cautious interpretation. Do not promise an automated future check unless
one is actually scheduled.

## GSC property coverage and technical discovery

Visible selector: domain properties `mctl.ai`, `dmitriimashkov.com`; URL-prefix
properties `https://academy.mctl.ai/`, `https://alice.mctl.ai/`,
`https://tg.mctl.ai/`. The operator added two properties during the session.
Academy's new property reported Processing data, which is unavailable data,
not an observed zero.

The domain property already covers every mctl.ai subdomain/protocol. Optional
prefix properties for convenient focused reports: `https://mctl.ai/`,
`https://docs.mctl.ai/`, `https://seerrsense.mctl.ai/`. Adding them does not
itself improve indexing. Do not sum overlapping properties. See
[Google's property documentation](https://support.google.com/webmasters/answer/34592).
No GSC properties, permissions or sitemap submissions were changed by Codex.

Live robots.txt files advertise sitemap URLs for MCTL, Alice, Telegram,
Academy, Docs and the personal site. The personal site's public
`/sitemap-index.xml` points to `/sitemap-0.xml`, which had 16 URLs. GSC
submission/success status was not reliably captured and remains unverified.

**SeerrSense discovery prerequisite:** public robots.txt has no Sitemap
directive, and `/sitemap.xml` returns HTTP 401 JSON (`invalid_token`). The
inspected Fastify server has no public sitemap route. This is documented but
**not fixed**. Add a narrowly public XML route and robots declaration when
implementing brief 2. Preserve authentication on private account/API/MCP paths.
Test public GET/HEAD and near-match/private-path isolation. A missing sitemap
is not proof that the whole site cannot be indexed.

Other domains from the incoming handoff:

- `https://mctl.ru/` and `https://mctl.me/` redirect to `https://mctl.ai/`, whose
  canonical is also mctl.ai. Separate content-reporting resources are not
  necessary for this initiative; redirect monitoring is optional.
- `erpact.online` apex could not resolve. Explicit DNS reads returned
  NOERROR/NODATA for apex A/AAAA/CNAME (A checked on 1.1.1.1 and 8.8.8.8).
  `www.erpact.online` has an A record but its HTTPS root returned 404.
  Do not call the entire domain NXDOMAIN or assume a working public website.
  Clarify/recover the intended site before prioritizing indexing. No DNS
  changes were authorized or made as part of this audit.

## Portfolio #195: exact restart state

Issue: [mctlhq/portfolio#195](https://github.com/mctlhq/portfolio/issues/195).
Reviewed proposal directory:
[requirements/design/tasks](https://github.com/mctlhq/mctl-gitops/tree/07f8f1fa5833f52405ed6e279e14974fdb013db8/platform-gitops/agents-state/portfolio/proposals/issue-195-improve-home-search-snippet-and-bilingua).

- Service/slug: `portfolio` / `issue-195-improve-home-search-snippet-and-bilingua`.
- Temporal workflow: `dev-loop-mctlhq-portfolio-195`.
- Temporal run created: `01a1adf0-59cd-772c-b867-8f6619e1cb0f`.
- Investigator Argo run `mctl-agents-investigate-c767c137` completed Succeeded.
- Current DevLoop: Running; `shepherd_in_loop=false`,
  `shepherd_in_loop_known=true`. Running alone does not identify its phase.
- Proposal `.status.yaml`: `proposed`, `control.requires_human_approval: true`.
  No implementation PR exists at this handoff check.
- Reviewed content digest:
  `sha256:c8a3aa846434ddca8ceba44f905ffae3e9c9fe40b9b580b1fc7c902da6829a51`.
- Latest issue comment reports the old grant
  `aar_582a96ba7dc944a6bb7c1666b31b7af6` was superseded after the amendment.
  The fresh pending grant is `aar_139e448c820e433f8ed0ef5302999ba1`.
  Re-read the current state and digest before any approval; these IDs can age.
- `.status.yaml`'s context snapshot hash is not the approval content digest.
  Compute the latter with `scripts/proposal-content-digest.py` in mctl-gitops.

Approved scope has NOT yet been granted. The proposal requests:

- Home title `Dmitrii Mashkov — Platform Engineering & AI`, Latin in both
  dictionary entries, as the repository requires.
- Shared home description dictionary; EN server-rendered metadata, RU dictionary
  translation. No dynamic language-dependent head or new Russian route.
- Existing Person node gets `alternateName: Дмитрий Машков`; sameAs destinations
  stay unchanged. Person/WebSite structured data already exists in production.
- Existing Telegram contact gets descriptive EN/RU link text, not a duplicate
  keyword link or a new “Telegram channel” page.
- Relevant existing tests/build-output gate and journal entry are updated.
  The extended detector needs the explicit mutation proof in the tasks.

The issue and proposal carry exact EN/RU copy. Read all three proposal files;
do not implement from this summary alone. PR #2408 removed an unsupported
search-outcome promise and aligned the deployment wording with portfolio's
MCP-only rule.

### Safe continuation

1. Obtain the operator's explicit decision on the concrete, current proposal.
   A pending question was shown in Codex; no reply was received before handoff.
2. Read `mctl_get_dev_loop` and the current issue/proposal/grant. The loop already
   exists: do not trigger a duplicate investigation or a standalone implementer.
3. With explicit human approval and an eligible human-admin authentication
   context, use the existing DevLoop approval path (`mctl_approve_dev_loop`,
   workflow id above). It binds the fresh grant/digest. Do not manually flip
   `.status.yaml`, impersonate an approver, or reuse the superseded grant.
4. Observe the implementer and its PR. The approval reason is audit text, not
   an instruction channel; amendments belong in proposal files through a PR.
5. Re-read whether the loop shepherds itself. At the latest check it did not.
   Follow the repository's documented review/shepherd flow if implementation
   completes; do not assume Running guarantees an eventual merge.
6. Complete current-head review and CI, merge with a merge commit, use
   release-please for the tag, deploy/roll back **only through mctl MCP tools**,
   and close the journal with observed lifecycle evidence. Reconcile any release
   automation with that MCP-only constraint rather than silently bypassing it.

## Remaining improvement queue

Use the detailed briefs and acceptance criteria in the canonical plan rather
than duplicating them here:

1. Alice existing setup entry point: **implemented and deployed as 2.10.0**.
2. SeerrSense: public sitemap prerequisite, then one focused setup guide.
3. Telegram: focused Claude connection guide; exploratory demand, avoid
   conflicting copies of existing instructions.
4. One verified MCP deployment walkthrough in platform docs; exploratory,
   lower confidence than observed Alice/Seerr queries.
5. Personal home: proposal #195, awaiting human approval as described above.

Pelican/labs remains lowest priority and outside the work shipped here. Its
production/staging roots were observed without X-Robots-Tag, but there was no
blanket ingress/Cloudflare indexing change. No new content pages beyond the
existing Alice `/setup` improvement have shipped. No GA4 implementation or
analytics-policy change was part of this work.

## Repository and operational rules for Claude

Read workspace AGENTS.md and the target repository's current instructions first.

- No direct commits/cherry-picks/rebases onto main. Feature branch → PR → CI and
  current-head review → merge commit (`--merge`, never squash).
- Conventional English commit subjects under 72 characters. No Co-Authored-By
  trailers. Tags use MAJOR.MINOR.PATCH without a `v` prefix.
- English for repository docs, code comments, GitHub issue/PR/review text.
  User-facing translated copy follows the site's language contract.
- Address all P1/P2 findings. A review of an old head is not a current review.
- Release-please repositories: do not hand-push release tags. Alice uses the
  explicit semver-tag release workflow. Never reuse an old deployment tag.
- Do not set repository-local git identity or overwrite unrelated user work.
- Portfolio: one DevLoop cycle at a time; implementation only from a human-
  approved proposal; static output, no analytics/cookies/third-party requests;
  existing Latin-title policy; deployments only through mctl MCP tools.
- Keep read errors/unknown distinct from observed absence. Never turn failed
  GSC/platform/DNS reads into “no traffic”, “clean” or “not found”.
- For shared plans, use the committed canonical plan linked by root AGENTS.md.

## Local workspace cautions and supporting artifacts

At handoff, mctl-web and mctl-alice are on main with the shipped changes.
Unrelated state was preserved:

- portfolio: `ci/auto-release-snapshot` (ahead of its tracking branch); do not
  reset or repurpose that checkout. Use an isolated worktree if needed.
- mctl-gitops: `fix/remove-portfolio-from-umami`, behind origin/main, with an
  existing untracked `.worktrees/` directory. Fetch refs without discarding it.
- mctl-telegram has an existing untracked `.worktrees/` directory.
- mctl-alice has an untracked `HANDOFF-CLAUDE-2026-10-21.md`.

Earlier local artifacts (supporting evidence, not canonical roadmaps):

- `output/codex-analytics-seo-handoff-2026-11-05.md` — incoming handoff; some
  tasks were already done, release status was incomplete and portfolio title
  advice conflicted with AGENTS.md. Do not follow it blindly.
- `output/seo-release-verification-2026-11-05.md` — earlier release/GSC snapshot.
- `output/gsc-coverage-audit-2026-11-06.md` — property/domain discovery checks.

Chrome native automation sometimes returned a stale accessibility tree after
GSC navigation: URL/title changed before the report body did. Validate the
actual property, radio selection, date range and table together; do not trust
only the address bar. The operator may use Chrome concurrently. Do not replace
an unread table with a guessed zero. Prefer a functioning GSC API/tool if one
is available in Claude's session.
