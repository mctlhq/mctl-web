# mctl.me Landing Page

Landing page for the mctl.me GitOps platform with Telegram bot integration for access requests.

## 🚀 Quick Start

### 1. Cloudflare Worker Setup (FIRST!)

```bash
cd cloudflare-worker

# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set secrets
wrangler secret put TELEGRAM_BOT_TOKEN
# Paste: 1378576085:AAEfwLsUyxo-0q1IUKzuanqS-RrY6263ocQ

wrangler secret put TELEGRAM_CHAT_ID
# Paste: 210408407

# Deploy worker
wrangler deploy
```

After deployment, you'll get a URL like:
```
https://mctl-landing-form.<your-subdomain>.workers.dev
```

### 2. Update Landing Page

Edit `static/js/form.js` line 6:
```javascript
const FORM_API_URL = 'https://mctl-landing-form.<your-subdomain>.workers.dev';
```

### 3. Create GitHub Repository

```bash
# Create on GitHub
gh repo create mctl-landing --public

# Push code
git remote add origin https://github.com/dmitriimashkov/mctl-landing.git
git add .
git commit -m "feat: initial landing page with Telegram integration"
git push -u origin main
```

### 4. Deploy to ArgoCD

В основном репозитории `mctl.me` уже есть:
- `platform-gitops/services/preview/admin/landing-page/values.yaml`
- `platform-gitops/services/preview/admin/landing-page/catalog-info.yaml`

ArgoCD автоматически задеплоит landing page на `https://platform.mctl.me`

## 📋 How It Works

```
User fills form → JavaScript POST to Cloudflare Worker
                ↓
         Cloudflare Worker validates
                ↓
         Sends message to Telegram
                ↓
      You receive notification in Telegram
```

## 🔧 Configuration

**Telegram Bot Token:** `1378576085:AAEfwLsUyxo-0q1IUKzuanqS-RrY6263ocQ`
**Your Chat ID:** `210408407`

## 🎨 Design

- DevOps terminal aesthetic
- Dark theme with neon accents
- Fully responsive
- Pure HTML/CSS/JS (no build step)

## 📦 Deployment

```bash
# Local test
docker build -t mctl-landing .
docker run -p 8080:80 mctl-landing
open http://localhost:8080

# Production
git push origin main
# GitHub Actions builds → ArgoCD deploys
```

## 🐛 Debugging

Test Cloudflare Worker directly:
```bash
curl -X POST https://YOUR-WORKER-URL \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "github": "testuser",
    "team": "test-team",
    "usecase": "Testing"
  }'
```

You should receive a Telegram message!

## 📝 Files

```
mctl-landing/
├── static/
│   ├── index.html       # Landing page
│   ├── css/style.css    # Styles
│   └── js/form.js       # Form handler
├── cloudflare-worker/
│   ├── index.js         # Worker code
│   ├── wrangler.toml    # Config
│   └── README.md        # Setup instructions
├── Dockerfile           # Nginx container
├── .github/workflows/
│   └── deploy.yml       # CI/CD
└── README.md            # This file
```

## 🚀 Next Steps

1. ✅ Deploy Cloudflare Worker
2. ✅ Update `FORM_API_URL` in `static/js/form.js`
3. ✅ Push to GitHub
4. ✅ Verify ArgoCD deployment
5. ✅ Test form submission
6. ✅ Receive Telegram notification!
