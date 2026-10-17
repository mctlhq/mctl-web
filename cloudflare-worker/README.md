# Cloudflare Worker для формы mctl.ai

Принимает POST запросы с формы и отправляет в Telegram.

## Setup

### 1. Создай Telegram бота

1. Открой `@BotFather` в Telegram
2. Отправь `/newbot`
3. Введи имя: `mctl.ai Access Bot`
4. Введи username: `mctlme_access_bot`
5. Получи **TELEGRAM_BOT_TOKEN**

### 2. Получи свой Chat ID

1. Открой `@userinfobot`
2. Отправь `/start`
3. Получи **TELEGRAM_CHAT_ID**

### 3. Deploy Cloudflare Worker

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set secrets
wrangler secret put TELEGRAM_BOT_TOKEN
# Paste your bot token

wrangler secret put TELEGRAM_CHAT_ID
# Paste your chat ID

# Deploy
wrangler deploy
```

### 4. Get Worker URL

After deployment, you'll get a URL like:
```
https://mctl-landing-form.<your-subdomain>.workers.dev
```

### 5. Update Landing Page

В `static/js/form.js` обнови URL:
```javascript
const FORM_API_URL = 'https://mctl-landing-form.<your-subdomain>.workers.dev';
```

## Testing

```bash
curl -X POST https://mctl-landing-form.<your-subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "github": "testuser",
    "team": "test-team",
    "usecase": "Testing the form"
  }'
```

Ты должен получить сообщение в Telegram!

## Routes — owned by mctl-gitops, not by this repo

The worker's five routes are OpenTofu resources in
[`mctlhq/mctl-gitops`](https://github.com/mctlhq/mctl-gitops)
(`infrastructure/cloudflare/zones/{mctl-ai,mctl-me,mctl-ru}/workers.tf`,
mctlhq/mctl-gitops#1179):

| Pattern | Zone | What the worker does there |
|---|---|---|
| `mctl.ai/api/*` | `mctl.ai` | the form submit / provisioning API |
| `mctl.me/*`, `*.mctl.me/*` | `mctl.me` | redirect to `mctl.ai` / `*.mctl.ai` |
| `mctl.ru/*`, `*.mctl.ru/*` | `mctl.ru` | redirect to `mctl.ai` / `*.mctl.ai` |

This repository owns the script, its `[vars]` and its secrets; `wrangler deploy`
publishes those. Do **not** add `routes` to `wrangler.toml` and do not add a
route in the dashboard: `wrangler deploy` publishes routes with a PUT that
replaces every route of the script, and a dashboard route is drift that the
nightly `cloudflare-drift.yml` in mctl-gitops reports. To add or change a
pattern, open a PR in mctl-gitops; if the new pattern needs new handling, change
`index.js` here in the same release.

## ZITADEL sign-in (stage C1a)

`zitadel.js` signs a visitor in through ZITADEL (customers org, GitHub IdP
preselected) and keeps the session on the server. The browser only holds an
opaque id in the `__Host-mctl_sid` cookie; the record behind it, including the
ID token, lives in the `SESSIONS` KV namespace under `sess:<sha256(id)>` for at
most 8 hours and never longer than the ID token. The legacy GitHub OAuth flow
(`/api/github/*`, `/api/submit` with `github_auth`) is unchanged.

| Route | What it does |
|---|---|
| `GET /api/zitadel/login` | redirect to ZITADEL with PKCE, state and nonce |
| `GET /api/zitadel/callback` | verify the ID token, create the session |
| `GET /api/zitadel/session` | who is signed in (never the token) |
| `POST /api/zitadel/logout` | delete the session, return the ZITADEL end-session URL |
| `POST /api/team/check` | name availability for the signed-in customer |
| `POST /api/submit` | with the session cookie: create the workspace for the signed-in customer |

The cookie routes that change something need `Origin` in `SESSION_ORIGINS` and
the header `X-MCTL-Request: 1`. A session cookie that is present but invalid is
a 401; it never falls back to the legacy flow. Each request re-presents the
stored ID token to the portal, which asks mctl-api; a 403 with an identity
refusal code there ends the session.

Logout deletes the KV record, but KV is eventually consistent across locations
(up to about 60 seconds), and the ID token stays valid at ZITADEL until its own
`exp`. For that window a cookie value captured before logout would still pass;
`HttpOnly`, `Secure` and the `__Host-` prefix are what make capturing it hard.

Configuration: the `ZITADEL_*`, `SESSION_ORIGINS` and `AUTH_FLOW_PUBLIC` vars in
`wrangler.toml`, the `SESSIONS` binding (namespace owned by mctl-gitops,
`infrastructure/cloudflare/account/workers-kv.tf`) and one secret:

```bash
# Numeric GitHub ids allowed to use the cookie flow while AUTH_FLOW_PUBLIC is
# not "true". Unset means nobody.
wrangler secret put AUTH_FLOW_TEST_GITHUB_IDS
```

Local run: `wrangler dev --env dev` uses the `mctl-web-dev` client, its own KV
namespace and `http://localhost:3000` as the only session origin.


### Public signup rollout and rollback

The canonical launch gates and live evidence belong in
[the onboarding plan](../docs/plans/site-onboarding-review.md#post-acceptance-roadmap-2026-10-17).
Public signup needs three independently deployed switches:

| Layer | Current restricted value | Public value | Delivery |
| --- | --- | --- | --- |
| API customer creation | `ZITADEL_HOOK_CUSTOMER_CREATE_GITHUB_IDS=268260640,334465501,47027422` | exactly `*` | GitOps API template; wait for both API replicas |
| Worker customer operations | `AUTH_FLOW_PUBLIC="false"` | `"true"` | production vars in wrangler.toml; merge triggers Deploy CF Worker |
| Static site default | `authFlow` fallback `legacy` | `zitadel` | nuxt.config.ts; generate, release, deploy website image |

Do not change the dev environment public flag. Keep the test-group secret,
legacy paths and identity configuration available during observation. Changing
an environment variable on the running nginx pod does not change the generated
site bundle. A URL query switch changes only UI, never API or Worker policy.

Before opening creation, use a fresh non-admin GitHub identity in the restricted
cohort and run the full positive/negative acceptance in the canonical plan.
Add its numeric ID through reviewed configuration; never publish its email,
credentials, cookies or tokens. Existing customers cannot prove first creation.
Prepare the three activation diffs and record the owner launch decision before
merging changes that activate them. Apply API, then Worker, then website; verify
each deployed value/version and health before advancing.

For the first rollout, observe continuously for 60 minutes, sample every five
minutes, then record checks at 24 hours and seven days. At each sample inspect:
API identity-hook refusal/error rates and replica readiness; Worker sign-in,
team/check and submit failures/429s; create-tenant workflow pending/running age
and terminal outcomes; portal availability and ready-outbox retry/accepted state.
Use Worker observability, API/portal logs, workflow status and the private outbox.
Distinguish expected bad credentials, conflict and rate-limit responses from
unexpected failures. Capture denominators and timestamps; an unavailable source
is unknown, not zero failures. Do not record request credentials or addresses.

Pause signup and investigate on any isolation/identity mismatch, duplicate
provisioning or duplicate ready notification; any failed acceptance journey;
API/portal unavailability lasting five minutes; three consecutive unexpected
server errors on one journey; a provisioning workflow pending/running beyond
15 minutes; or a ready notification still retrying 15 minutes after verified
readiness. Missing monitoring for two consecutive samples also pauses rollout.
These are initial operational thresholds, not customer service guarantees.

Rollback order:

1. Deploy Worker `AUTH_FLOW_PUBLIC="false"` first and confirm a signed-in
   account outside the cohort is refused by both team/check and submit.
2. Restore the API numeric-ID cohort and wait for both replicas to be ready;
   verify new outside-cohort account creation is refused. Existing accounts
   continue signing in; do not delete users, tenants or in-flight workflows.
3. Restore the static website default via a reviewed patch release (or a known
   restricted image after checking its compatibility). Confirm the generated
   public page, not merely the source config. Recheck restricted-cohort access.
4. Observe any already accepted workflows to terminal state and reconcile
   notifications. Preserve evidence and document the cause before reopening.

The Worker/API tests establish the local policy behavior. They do not prove
Cloudflare propagation, Kubernetes rollout or actual customer delivery; those
need deployment and browser evidence recorded in the plan.

### Customer account session revocation

`POST /api/internal/customer-sessions/revoke` accepts only a ZITADEL-signed
machine JWT matching `SESSION_REVOCATION_SUBJECT` and
`SESSION_REVOCATION_AUDIENCE`. Empty pins disable the endpoint. The lifecycle
machine lives outside the customer organization and has user-management access
only to that organization; its dedicated project provides the JWT audience.

The API supplies an approved numeric `github_id` and immutable ZITADEL `subject`.
The Worker uses its existing `SESSIONS` binding, without a Cloudflare account
API token. It fences the old subject, deletes matching sessions in bounded
pages, and verifies a second pass after the KV propagation window. HTTP 202
requires a retry; only HTTP 200 with `complete: true` proves completion.
Malformed data, failed reads or invalid pagination fail closed. A replacement
ZITADEL subject for the same GitHub account is preserved.

Deploy the Worker and pin the public machine subject/project IDs before enabling
`CUSTOMER_DELETION_ENABLED` in the API. Keep the signup rollout gates unchanged.
