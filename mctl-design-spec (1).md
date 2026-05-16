# MCTL — Landing Design Spec

**File:** `mctl-redesign.html`
**Direction:** Swiss-engineering minimalism × editorial density
**Audience:** mixed (developers + business)
**Posture:** sharp, confident, AI-native, mature
**Source repos consulted:** `mctlhq/mctl-web` (i18n, audience model, stack), `mctlhq/mctl-docs` (current product framing, 39 MCP tools, Self-Healing Agent)

---

## 0. Navigation & chrome

### Top utility bar
`Status — all systems operational` · `app.mctl.ai` · `docs` · `MCP connector` · `EN / RU` · `Sign in →`

### Primary nav
**Brand:** `MCTL / control plane` (hexagon mark with cyan crosshair)
**Links:** Why `01` · Platform `02` · How it works `03` · Who it's for `04` · Stack `05` · Plans `06`
**Right side:** `⌘K` keycap · `GitHub ↗` · **`Request access →`** (primary)

---

## 1. Hero (S/00)

**Eyebrow:** `S/00 — AI-native Kubernetes platform · self-service · GitOps · MCP`

**H1 (current default):**
> The platform team **is now** *an agent*.

**Lede:**
> MCTL is a production-grade, **AI-native Kubernetes platform** for growing product teams. GitOps, secrets, team isolation — built in. Sign in with GitHub, get a namespace in two minutes, and an **on-call agent** that opens fix PRs while you sleep.

**CTAs:** `Request access →` · `Read the docs` · `Connect MCP`

**Stats strip (4):**
| Number | Label |
|---|---|
| 39 tools | MCP surface |
| 7 clients | Claude · Cursor · VS Code… |
| 24/7 | Self-healing agent on call |
| 0 tickets | For routine work |

### Hero console (right column)

Tabs: `~/checkout-web` (active) · `~/payments-api` · `+`
Header: `team: team/checkout · ns: checkout`

**Conversation:**
- **you →** ship checkout-web. attach postgres, TLS on checkout.acme.dev, preview env for PR #214.
- **mctl →** 2 PRs on `team/checkout-gitops`. Vault refs only. ArgoCD syncs on merge.
- **you →** scale payments-api 6–12 for the sale. rollback if p99 > 400 ms.
- **mctl →** window 12:00–18:00, gate on p99. *mctl-agent* on AlertManager — fix PR if SLOs trip.

**Run-log rows:**
1. `12:04:11` — service **checkout-web** from **node-api** template — *catalog*
2. `12:04:13` — postgres **checkout-db** · 1 vCPU · backups on — *crunchy-pg*
3. `12:04:14` — vault path **kv/team/checkout/db** · cert-manager TLS — *vault · cm*
4. `12:04:15` (warn) — preview env **pr-214.checkout.dev** · 7-day TTL — *policy/auto*
5. `12:04:16` — argocd sync queued — merge to apply — *ops.mctl.ai*

**Console foot:** `say what you need · or use /deploy /scale /rollback /preview` · `2 PRs · audited`

**Side meta panels:**
- workspace → `team/checkout` — namespace + RBAC + quotas
- desired state → `git@team/checkout-gitops` — argocd reconciles
- secrets → `vault · kv/team/checkout` — references, never values

---

## 2. Why MCTL (S/01) — editorial intro

**Left column — `S/01 · Why MCTL`**
> Most product teams don't have a platform problem. ~~They have a queue problem.~~ They have a **queue** problem.
>
> Hiring platform engineers is expensive. So is the alternative: developers waiting on a ticket every time they need a namespace, a domain, a secret, or a preview environment. MCTL gives you a production-grade platform without the headcount — *and* without the queue.

**Right column — `S/01.B · Built for growing product teams`**
> Self-service, not tickets. Isolation by default. Production-ready from day one.
>
> Every team gets its own namespace, RBAC, network policies and resource quotas — no shared-cluster risk. Push code, GitOps deploys. Secrets in Vault, TLS via cert-manager, SSO via GitHub. Security baked into every layer, not bolted on at audit time.

---

## 3. Platform (S/02) — six specs

**Section title:** Everything your team needs to ship faster. *Six primitives, one control plane, zero glue code — and an AI that's already on call.*

### 01 / 06 — Production-Ready Platform
*Tag: `infrastructure out of the box`*
Pre-integrated Kubernetes platform with Backstage, ArgoCD, Vault and cert-manager already wired together. Scale without rebuilding infrastructure from scratch.
Chips: `k3s · k8s` · `backstage` · **`day-one prod`**

### 02 / 06 — GitOps Delivery
*Tag: `push to deploy`*
Fully automated deployments. No manual `kubectl`. Every change flows through Git, ArgoCD reconciles the cluster, and code moves to production securely and predictably.
Chips: `argocd` · `github actions` · **`zero kubectl`**

### 03 / 06 — Enterprise Security
*Tag: `vault · certs · sso`*
Secrets in Vault, automatic TLS via cert-manager, GitHub SSO across the platform. Per-team RBAC, network policies and resource quotas — security on every layer, not as an afterthought.
Chips: `vault` · `cert-manager` · `github oidc`

### 04 / 06 — Self-Service Catalog
*Tag: `no tickets · no waiting`*
Pick from ready-made templates in the Backstage-powered Service Catalog. Provision services, databases and infra in minutes. Repos and configs are generated for you, owned by you.
Chips: `backstage` · `templates` · `catalog-info`

### 05 / 06 — AI-Native Operations
*Tag: `39 MCP tools · 7 AI clients`*
Deploy, rollback, preview and monitor through natural language. Connect Claude, Cursor, VS Code or any MCP-compatible client — your AI sees the same surface your engineers do, with the same audit trail. *kubectl is now a fallback, not the interface.*
Chips: **`mcp · 39`** · `claude · cursor · vs code` · `audited`

### 06 / 06 — Self-Healing Agent
*Tag: `mctl-agent · alertmanager → pr`*
Automated incident response. The *mctl-agent* watches AlertManager, diagnoses the issue and opens a PR with the fix — often before you've finished reading the page. Humans approve; GitOps applies. The on-call rotation thanks you.
Chips: **`on-call ai`** · `alertmanager` · `gitops fix`

---

## 4. How it works (S/03)

**Section title:** Three steps to production. *Sign in. Pick a template. Push or ask.*

### step 01 — Get your workspace.
Sign in with GitHub, choose a team name. Your isolated namespace, RBAC, secrets, and quotas are provisioned in about two minutes — no platform engineer in the loop.
Code: `Sign in → Create team → Get namespace`

### step 02 — Configure your service.
Pick a template from the Service Catalog. Specify database, domain, and secrets references. The repo and configs are generated automatically — owned by your team, ready to clone.
Code: `Choose template → Configure → Generate`

### step 03 — Push your code, or ask AI.
Push and GitOps deploys it. Or talk to Claude, Cursor or VS Code through MCP and let it deploy, roll back, or spin up a preview environment for you. Every action is auditable.
Code: `git push → Build → Deploy → Live ✓`

### Right column — `team/checkout-gitops · catalog-info.yaml` (generated from `node-api` template)

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: checkout-web
  owner: team/checkout
spec:
  type: service
  lifecycle: production
  runtime: node-api  # template
  database: postgres
  domain: checkout.acme.dev
  secrets:
    - ref: vault://kv/team/checkout/db
  previewEnvs:
    enabled: true
    ttl: 7d
  tls: cert-manager
```

---

## 5. Audience (S/04) — light surface

**Section title:** Built for teams that want to move fast. *Four shapes of the same problem.*

| # | Title | Lede | Tag |
|---|---|---|---|
| 01 · Startups | Multiple teams, no DevOps. | Ship to production from day one — without hiring platform engineers. The first ten people you hire should not be the ones writing your Helm charts. | → Day-one production |
| 02 · B2B SaaS | Multi-tenant by default. | Manage customer environments with one consistent isolation model. RBAC, network policies and quotas per tenant — no bespoke clusters per logo. | → Per-customer isolation |
| 03 · Platform teams | Already building one? | Accelerate with a production-ready foundation instead of starting from scratch. Bring your golden paths; keep your CODEOWNERS. Stop re-inventing ArgoCD wiring. | → Skip the first six months |
| 04 · White-label partners | Branded developer platform. | Offer your clients a developer platform with your name on the front. MCTL powers the infrastructure underneath; your brand stays on top. | → Your brand, our pipes |

---

## 6. Stack (S/05)

**Section title:** Boring on purpose. *Battle-tested open source, integrated into a unified platform.*

### Layer 01 · Service catalog — Backstage-powered portal
Browse services, owners, dependencies, on-call. Software templates generate repos, configs and CI — every entity backed by code, not a stale wiki.
Items: **Backstage** · portal · **catalog-info** · entities · **tech-docs** · docs as code · **scaffolder** · templates

### Layer 02 · GitOps engine — ArgoCD-native
App-of-apps pattern. ApplicationSets per tenant. Sync waves for ordered rollout. Health gates first-class. Every change is a commit; rollback is *git revert*.
Items: **ArgoCD** · reconciler · **Helm** · packaging · **Kustomize** · overlays · **GitHub Actions** · CI

### Layer 03 · Secrets & identity — Vault + cert-manager + GitHub OIDC
Secrets live in Vault. Manifests carry references, never values. TLS rotates on its own. Identity flows from GitHub SSO to scoped per-team service accounts.
Items: **HashiCorp Vault** · kv · **cert-manager** · TLS · **External Secrets** · sync · **GitHub OIDC** · SSO

### Layer 04 · Kubernetes runtime — Runs where your cluster runs
k3s for lightweight footprints, full k8s for the rest. EKS, GKE, AKS, on-prem, air-gapped — wherever *kubectl* reaches. Nothing leaves your VPC unless you say so.
Items: **k3s · k8s** · runtime · **OpenTelemetry** · traces · **Crunchy PG** · databases · **BYOC** · any cloud

---

## 7. Before / After (S/06)

**Section title:** What changes the day you onboard MCTL. *Same cluster. Same team. Different rhythm.*

### Before (today)
- "Hi DevOps, can we get a namespace for **checkout-web**?" — answered **tomorrow, maybe Friday**.
- Preview environments are a **three-day project**, so engineers stop using them.
- Secrets sit in someone's `~/.env.local`. The audit is a quarterly emergency.
- Two SREs answer the same five questions every week. Burnout becomes a roadmap item.
- "Roll it back" means **three Slack threads** and a kubectl session.

### With MCTL (day 1)
- Devs sign in with GitHub. Their namespace exists in **about two minutes**, with RBAC and secrets included.
- Preview environments are **a one-line request**. They expire on their own.
- Secrets live in **Vault**. Manifests carry references. The audit is the diff.
- Platform engineers ship **policy and golden paths**, not tickets.
- "Roll it back" is *git revert*. ArgoCD does the rest. Receipts attached.

---

## 8. Plans (S/07) — *no public pricing*

**Section title:** Plans that fit your stage. *Talk to us — we'll size it together.*

> All CTAs route to **Contact us**. No numbers exposed.

### Starter — Contact us
For individuals and small experiments.
- 1 team
- 2 services
- Standard templates
- Shared infrastructure
- Community support
- Community MCP access

### Professional *(Popular)* — Contact us
For growing engineering teams.
- Unlimited teams
- Custom templates
- Dedicated namespaces
- Priority support
- SLA guarantee
- Full MCP toolset (20+ tools)

### Enterprise — Contact us
For organizations at scale.
- White-label platform
- Dedicated infrastructure
- Custom integrations
- Dedicated support engineer
- Enterprise SLA
- Custom MCP integrations

---

## 9. CTA (S/08)

**Headline:** Stop triaging. *Start shipping.*

**Body:**
> Invite-only beta. Sign in with GitHub, pick a team name, tell us what you'll build — your namespace is provisioned in about two minutes.

**Buttons:** `Sign in with GitHub` · `Read the docs` · `Connect MCP`

**Microcopy:** No credit card · No platform team required · You can leave any time — your repos are yours.

---

## 10. Footer (S/09)

**Tagline:** Self-service Kubernetes for growing product teams. © 2026 MCTL.

**Platform:** Production-ready platform · GitOps delivery · Self-service catalog · AI-native operations · Tech stack
**Resources:** Documentation · MCP connector · Status — ops.mctl.ai · Changelog · GitHub — mctlhq
**Company:** Plans · Who it's for · Contact · Privacy policy · Security

**Foot meta:** `app.mctl.ai · ops.mctl.ai · workflows.mctl.ai · docs.mctl.ai` · `EN · RU · invite-only beta · 2026`

---

## 11. Color system

### Dark surface (default — "Engineering")
| Token | Value | Use |
|---|---|---|
| `--ink` | `#0a0b0d` | page background |
| `--ink-2` | `#0f1114` | elevated surfaces |
| `--ink-3` | `#15181d` | cards / consoles |
| `--line` | `#1f242b` | hairlines |
| `--line-2` | `#2a313a` | hairlines (stronger) |
| `--fg` | `#e6e7e9` | primary text |
| `--fg-2` | `#a4a8ae` | secondary text |
| `--fg-3` | `#6b7079` | tertiary / metadata |

### Light surface ("Editorial" — paper)
| Token | Value |
|---|---|
| `--paper` | `#f1ede4` |
| `--paper-ink` | `#15181d` |
| `--paper-fg` | `#3a3f47` |
| `--paper-line` | `#d8d2c4` |

### Accents (Tweaks-selectable)
| Name | Primary | Highlight |
|---|---|---|
| Cyan *(default)* | `#00e5ff` | `#7df2ff` |
| Acid lime | `#bdf24a` | `#dcff8c` |
| Vermilion | `#ff5a36` | `#ff8a6a` |
| Lilac | `#b07aff` | `#d6b3ff` |

### Status
ok `#7cf2a4` · warn `#f5a524` · bad `#ff6b6b`

### Syntax
key `#7df2ff` · string `#bdf24a` · comment `#6b7079`

---

## 12. Typography

| Role | Family | Weight | Notes |
|---|---|---|---|
| Display / UI | **Geist** | 300–700 | sans, tight tracking on H1 (-0.02em) |
| Mono | **JetBrains Mono** | 400–600 | code, eyebrows, markers, stats, console |
| Editorial accents | **Instrument Serif** | 400 | italics in section titles, tweak preview |

### Scale
- H1 (hero): `clamp(48px, 8.4vw, 132px)`, line-height 0.92, tracking -0.02em
- Section title: `clamp(28px, 3.6vw, 56px)`, line-height 1.05
- Lede: 18–20px, line-height 1.55
- Body: 15–16px
- Marker / eyebrow: 11–12px mono, uppercase, letter-spacing 0.12em
- Stat number: 40–56px

---

## 13. Layout & rhythm

- **Page padding:** `clamp(20px, 4vw, 56px)`
- **Section vertical padding:** `clamp(72px, 9vw, 132px)`
- **Hero split:** 7 / 5
- **Specs grid:** 3-up at >960px
- **One light section** (Audience) for editorial rhythm; everything else dark
- **Hairlines** (1px solid `--line`) define every container; no shadows by default
- **Numerals everywhere** — S/00…S/09 markers, 01/06 spec counters, monospaced stats — turns the page into a technical document

---

## 14. Components

- **Console mock** — chat-style: `you` / `mctl` exchanges, run-log with status dots, input strip with `/deploy /scale /rollback /preview`
- **Spec card** — number, glyph, name, code-tagged subtitle, body, tag chips
- **Step card** — large numeral, prose, `stepcode` command line
- **YAML column** — JetBrains Mono, syntax-colored
- **Plan card** — head + price (Contact us), description, feature list, CTA. Popular tier inverts contrast.
- **Compare grid** — two-column "Then / Now" with highlighted "Now" side
- **Marker bar** — `S/0X · Section` mono label preceding each section title

---

## 15. Tweaks panel (live theming)

Floating, bottom-right, 300px, mono. Activated via toolbar toggle.

| Control | Options |
|---|---|
| **Accent** | Cyan / Acid lime / Vermilion / Lilac |
| **Surface** | Engineering (dark) / Editorial (paper) — full theme flip |
| **Lede voice** | Eng / Bold / Editorial — rewrites the lede paragraph |
| **Headline** | Auto + 7 curated H1 options *(see §16)* |

State persists via `__edit_mode_set_keys` host protocol.

---

## 16. Headline options (in panel)

1. **Auto** — follows Voice
2. The platform team you didn't *have to hire*
3. Production Kubernetes, *day one*
4. *kubectl* is the fallback now
5. Run Kubernetes like a *100-person* platform team
6. **The platform team is now *an agent*** *(current default)*
7. Ship code. *Sleep through the night*
8. Kubernetes, *finally civilized*

### Voice presets (lede rewrites)
- **Eng:** AI-native Kubernetes platform · GitOps · secrets · team isolation · on-call agent.
- **Bold:** "Sign in with GitHub, get a namespace in two minutes, ship before lunch."
- **Editorial:** "Most product teams don't have a platform problem — they have a queue problem… Boring on purpose."

---

## 17. Content sources & ground truth

- Repo `mctlhq/mctl-web` — i18n strings, audience model, stack list
- Repo `mctlhq/mctl-docs` — current product framing, tool counts (39), Self-Healing Agent definition
- **Pricing:** deliberately no public numbers — all CTAs route to "Contact us"

---

## 18. Files

| Path | Purpose |
|---|---|
| `mctl-redesign.html` | current design *(this spec)* |
| `mctl-redesign-v1.html` | first pass, before docs/web repo content was wired in |
| `mctl-design-spec.md` | this document |

---

## 19. Open questions / next steps

- Lock in one **default headline** per audience (engineering vs board) before publish
- Decide whether AI-Native + Self-Healing should be **promoted to hero** instead of sitting at spec 05/06
- Consider a real product screenshot in place of the YAML column on "How it works"
- Localize: `mctl-web` already supports RU; copy decks should mirror
