# mctl.me Landing Page

Landing page for the mctl.me GitOps platform with GitHub OAuth authentication and Telegram notifications.

## How It Works

```
User clicks "Sign in with GitHub"
    ↓
GitHub OAuth → Cloudflare Worker exchanges code for token
    ↓
Worker fetches user profile, signs login with HMAC
    ↓
Redirect back with verified identity in URL hash
    ↓
User fills team name → submits form
    ↓
Worker verifies HMAC signature → sends Telegram notification
```

## Setup

### 1. Create GitHub OAuth App

Go to https://github.com/settings/developers → New OAuth App:
- **Application name:** mctl.me Landing
- **Homepage URL:** https://mctl.me
- **Authorization callback URL:** https://mctl.me/api/github/callback

### 2. Cloudflare Worker Secrets

```bash
cd cloudflare-worker

wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put GITHUB_OAUTH_HMAC_KEY    # random 32+ char string

wrangler deploy
```

### 3. Deploy

```bash
git push origin main
# GitHub Actions builds → ArgoCD deploys to https://mctl.me
```

## Local Development

```bash
docker build -t mctl-landing .
docker run -p 8080:80 mctl-landing
open http://localhost:8080
```

Note: OAuth flow won't work locally (GitHub redirects to production callback URL).

## Worker API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/github/login` | Initiate GitHub OAuth |
| GET | `/api/github/callback` | OAuth callback, exchange code, redirect with user data |
| POST | `/api/submit` | Submit access request (requires HMAC-verified GitHub auth) |

## Files

```
mctl-landing/
├── static/
│   ├── index.html          # Landing page
│   ├── css/style.css        # Styles
│   ├── js/form.js           # OAuth + form handler
│   └── img/                 # Tech stack SVG logos
├── cloudflare-worker/
│   ├── index.js             # Worker (OAuth + Telegram)
│   └── wrangler.toml        # Config
├── Dockerfile               # Nginx container
├── .github/workflows/
│   └── deploy.yml           # CI/CD
└── README.md
```

## Security

- **CSRF protection:** State parameter signed with HMAC, stored in HttpOnly cookie (5 min TTL)
- **Identity verification:** GitHub login signed with HMAC — cannot forge the `#auth=` URL fragment
- **Token isolation:** GitHub access token used only server-side in Worker, never sent to frontend
- **CORS:** Restricted to `https://mctl.me`
