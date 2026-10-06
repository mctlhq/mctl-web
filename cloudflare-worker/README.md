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
