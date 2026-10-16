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
stored ID token to the portal, which asks mctl-api; a 403 there ends the
session.

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
