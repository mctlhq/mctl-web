# mctl-web

Landing page and MCP connect page for the mctl.ai platform.

- **mctl.me / mctl.ai** — main landing page (request access, platform overview)
- **mctl.me/mcp** — MCP connect page (sign in with GitHub, get pre-filled client configs)

## Architecture

```
Browser ──(HTTPS)──► nginx (static files)
                         └── index.html      → mctl.me
                         └── mcp/index.html  → mctl.me/mcp

Browser ──(HTTPS)──► Cloudflare Worker (mctl.me/api/*)
                         └── /api/github/login          → initiate OAuth
                         └── /api/github/login?for=mcp  → initiate OAuth (MCP, read:org scope)
                         └── /api/github/callback       → exchange code, redirect with user data
                         └── /api/submit                → submit access request
                         └── /api/contact               → contact form
```

## Cloudflare Worker Secrets

```bash
cd cloudflare-worker

wrangler secret put TELEGRAM_BOT_TOKEN      # Telegram bot for notifications
wrangler secret put TELEGRAM_CHAT_ID        # Telegram chat ID
wrangler secret put GITHUB_CLIENT_ID        # GitHub OAuth App client ID
wrangler secret put GITHUB_CLIENT_SECRET    # GitHub OAuth App client secret
wrangler secret put GITHUB_OAUTH_HMAC_KEY   # Random 32+ char string for signing
wrangler secret put BACKSTAGE_API_TOKEN     # HMAC secret for Backstage JWT
wrangler secret put RESEND_API_KEY          # Resend.com for welcome emails
```

GitHub OAuth App settings:
- Homepage URL: `https://mctl.me`
- Callback URL: `https://mctl.me/api/github/callback`

## MCP OAuth Flow

The `/mcp` page has a "Sign in with GitHub" button that requests `read:org` scope (needed by `api.mctl.ai` to validate team membership). After auth, the token is returned in the URL fragment — it never appears in server logs.

```
User clicks "Sign in with GitHub"
    ↓
GET /api/github/login?for=mcp
    → sets __gh_flow=mcp cookie, requests read:org+read:user+user:email
    ↓
GitHub OAuth callback → /api/github/callback
    → detects __gh_flow=mcp
    → redirects to /mcp/#auth=<base64({token, login, name, avatar_url})>
    ↓
/mcp page reads #auth fragment, fills in client configs with real token
```

## Deployment

Static files: Docker image `ghcr.io/mctlhq/mctl-web:{version}` served by nginx.
Worker: Cloudflare Worker at `mctl.me/api/*`.

Both deploy automatically on tag push:

```bash
git tag 1.2.1 && git push origin 1.2.1
# → GitHub Actions builds ghcr.io/mctlhq/mctl-web:1.2.1
# → CI commits new tag to mctl-core → ArgoCD deploys
```

Worker deploys on any push to `main` that touches `cloudflare-worker/**`.

## Local Development

```bash
docker build -t mctl-web .
docker run -p 8080:80 mctl-web
open http://localhost:8080
```

OAuth won't work locally (callback URL is hardcoded to production).

## Files

```
mctl-web/
├── static/
│   ├── index.html          # Landing page
│   ├── mcp/index.html      # MCP connect page
│   ├── css/                # Styles (JetBrains Mono, dark theme, --color-accent: #00f5ff)
│   └── js/                 # Auth, form, nav, i18n
├── cloudflare-worker/
│   ├── index.js            # Worker: OAuth, form submit, contact, Telegram
│   └── wrangler.toml       # Route: mctl.me/api/*
├── nginx.conf
├── Dockerfile
└── .github/workflows/
    ├── build.yml           # Docker build + mctl-core tag update on release
    └── deploy.yml          # CF Worker deploy on cloudflare-worker/** changes
```

## Security

- CSRF: state param signed with HMAC, stored in HttpOnly cookie (5 min TTL)
- Identity: GitHub login signed with HMAC — `/mcp` fragment `#auth=` cannot be forged
- MCP token: returned in URL fragment only, never sent to server after callback
- CORS: restricted to `https://mctl.me`
