# Cloudflare Worker для формы mctl.me

Принимает POST запросы с формы и отправляет в Telegram.

## Setup

### 1. Создай Telegram бота

1. Открой `@BotFather` в Telegram
2. Отправь `/newbot`
3. Введи имя: `mctl.me Access Bot`
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

## Custom Domain (опционально)

Если хочешь использовать `mctl.me/api/submit`:

1. В Cloudflare Dashboard → Workers → mctl-landing-form
2. Settings → Triggers → Add Route
3. Route: `mctl.me/api/*`
4. Zone: `mctl.me`

Тогда форма будет отправлять на `https://mctl.me/api/submit`
