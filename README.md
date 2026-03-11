# mctl-web

Landing page and MCP connector for the mctl.ai platform.

## What It Does

mctl-web serves the public-facing website for mctl.ai — a landing page, documentation, and an MCP connector that lets users authenticate with GitHub and receive pre-filled client configurations. The static site runs in an nginx container while a Cloudflare Worker handles the serverless API (OAuth, form submissions, team checks).

## Architecture

```
                        ┌─────────────────────────────────┐
                        │        Static Layer (nginx)      │
                        │                                  │
  Browser ─(HTTPS)────► │  /           → index.html        │
                        │  /mcp        → mcp/index.html    │
                        │  /docs       → docs/index.html   │
                        │  /healthz    → 200 OK            │
                        └─────────────────────────────────┘

                        ┌─────────────────────────────────┐
                        │     Worker Layer (Cloudflare)    │
                        │                                  │
  Browser ─(HTTPS)────► │  /api/github/login    → OAuth    │
                        │  /api/github/callback → redirect │
                        │  /api/submit          → Telegram │
                        │  /api/contact         → Resend   │
                        │  /api/github/check-team → proxy  │
                        └─────────────────────────────────┘
```

## Tech Stack

| Category   | Details                                                        |
| ---------- | -------------------------------------------------------------- |
| Frontend   | Vanilla HTML / CSS / JS — no build step, no npm               |
| Styling    | CSS variables, dark theme, JetBrains Mono, responsive clamp() |
| i18n       | Custom JS with `data-i18n` attributes, multi-language          |
| Worker     | Cloudflare Worker (Node.js runtime via wrangler)               |
| Server     | nginx Alpine (static files, security headers, caching)         |
| Container  | Docker (nginx:alpine)                                          |
| CI/CD      | GitHub Actions → GHCR → ArgoCD (static), wrangler (worker)    |
| Registry   | ghcr.io/mctlhq/mctl-web                                       |

## Project Structure

```
mctl-web/
├── static/                     # All static assets (no build step)
│   ├── index.html              # Landing page
│   ├── mcp/index.html          # MCP connector page
│   ├── docs/index.html         # Documentation page
│   ├── css/
│   │   ├── style.css           # Main entry (imports modules)
│   │   └── modules/            # base, layout, components, sections, utilities
│   ├── js/                     # 13 vanilla JS modules
│   │   ├── app.js              # Global namespace
│   │   ├── auth.js             # GitHub OAuth & token management
│   │   ├── init.js             # Page initialization
│   │   ├── i18n.js             # Internationalization engine
│   │   ├── translations.js     # Multi-language data
│   │   ├── access-form.js      # Access request handling
│   │   ├── contact-form.js     # Contact form
│   │   ├── nav.js              # Navigation
│   │   ├── ui.js               # UI utilities
│   │   ├── dom.js              # DOM helpers
│   │   ├── state.js            # Global state
│   │   ├── team-input.js       # Team availability check
│   │   └── validators.js       # Form validation
│   └── img/                    # Images & icons (17 files)
├── cloudflare-worker/
│   ├── index.js                # Worker logic (OAuth, forms, proxy)
│   ├── wrangler.toml           # Routes, env vars
│   └── README.md               # Worker setup guide
├── Dockerfile                  # nginx Alpine image
├── nginx.conf                  # Security headers, routing, caching
├── .env.example
└── .github/workflows/
    ├── build.yml               # Docker build on tags/PRs
    └── deploy.yml              # CF Worker deploy on main
```

## Getting Started

### Prerequisites

- Docker
- [wrangler](https://developers.cloudflare.com/workers/wrangler/) (for worker development)

### Local Development

```bash
docker build -t mctl-web .
docker run -p 8080:80 mctl-web
open http://localhost:8080
```

OAuth callbacks are hardcoded to production, so authentication flows will not work locally.

### Cloudflare Worker Development

```bash
cd cloudflare-worker
wrangler dev          # starts local dev server with hot reload
wrangler deploy       # deploy to production
```

## Configuration

### Environment Variables (Cloudflare Worker)

Secrets (set via `wrangler secret put`):

| Secret                   | Description                            |
| ------------------------ | -------------------------------------- |
| `TELEGRAM_BOT_TOKEN`    | Telegram bot for notifications         |
| `TELEGRAM_CHAT_ID`      | Telegram chat ID                       |
| `GITHUB_CLIENT_ID`      | GitHub OAuth App client ID             |
| `GITHUB_CLIENT_SECRET`  | GitHub OAuth App client secret         |
| `GITHUB_OAUTH_HMAC_KEY` | Random 32+ char string for signing     |
| `BACKSTAGE_API_TOKEN`   | HMAC secret for Backstage JWT          |
| `RESEND_API_KEY`        | Resend.com API key for welcome emails  |

Config vars (in `wrangler.toml`):

| Variable             | Value                  |
| -------------------- | ---------------------- |
| `BASE_DOMAIN`        | `mctl.ai`             |
| `GITHUB_ORG`         | `mctlhq`              |
| `BACKSTAGE_APP_URL`  | `https://app.mctl.ai` |

Worker routes: `mctl.ai/api/*`, `mctl.ai/*`, `*.mctl.ai/*`

GitHub OAuth App settings — Homepage: `https://mctl.ai`, Callback: `https://mctl.ai/api/github/callback`

### nginx Configuration

- Security headers: HSTS (1 year), strict CSP, X-Frame-Options
- Caching: JS/CSS 60 s, images 30 d
- Health endpoints: `/healthz`, `/readyz`

## Pages

| Path    | Description                                                                    |
| ------- | ------------------------------------------------------------------------------ |
| `/`     | Landing page — hero, features, pricing, access request form, contact form      |
| `/mcp`  | MCP connector — GitHub OAuth sign-in, pre-filled client configs with real token |
| `/docs` | Documentation and platform guides                                              |

## OAuth Flow

The `/mcp` page uses GitHub OAuth to issue a personal token with `read:org` scope (required by `api.mctl.ai` to validate team membership). The token is returned in the URL fragment and never appears in server logs.

```
┌──────────┐        ┌──────────────────┐        ┌──────────┐
│  Browser  │        │  CF Worker /api  │        │  GitHub  │
└─────┬─────┘        └────────┬─────────┘        └─────┬────┘
      │  Click "Sign in"      │                        │
      │──────────────────────►│                        │
      │  GET /api/github/     │                        │
      │  login?for=mcp        │                        │
      │                       │  set __gh_flow=mcp     │
      │                       │  cookie + HMAC state   │
      │◄──────────────────────│                        │
      │  302 → github.com/    │                        │
      │  login/oauth/authorize│                        │
      │───────────────────────────────────────────────►│
      │                       │                        │
      │◄──────────────────────────────────────────────│
      │  302 → /api/github/callback?code=…&state=…    │
      │──────────────────────►│                        │
      │                       │  verify HMAC state     │
      │                       │  exchange code→token ──────────►│
      │                       │◄──────────────────────────────│
      │                       │  sign {token,login,    │
      │                       │  name,avatar} with HMAC│
      │◄──────────────────────│                        │
      │  302 → /mcp/#auth=    │                        │
      │  <base64(signed blob)>│                        │
      │                       │                        │
      │  /mcp reads #auth     │                        │
      │  fragment, fills in   │                        │
      │  client configs       │                        │
```

## Security

| Measure          | Implementation                                                       |
| ---------------- | -------------------------------------------------------------------- |
| CSRF             | State param signed with HMAC-SHA256, stored in HttpOnly cookie (5 min TTL) |
| Identity         | GitHub login signed with HMAC — `#auth=` fragment cannot be forged   |
| Token exposure   | MCP token returned in URL fragment only, never sent to server after callback |
| CORS             | Restricted to `https://mctl.ai`                                     |
| CSP              | Strict Content-Security-Policy headers via nginx                     |
| HSTS             | Enabled, max-age 1 year                                             |
| Rate limiting    | 5 requests / 5 minutes on `/api/submit`                             |

## Testing

No automated tests currently. Manual verification against production OAuth flow.

## CI/CD

| Workflow     | Trigger                                     | Action                                            |
| ------------ | ------------------------------------------- | ------------------------------------------------- |
| `build.yml`  | Semver tags (`v*.*.*`) + pull requests      | Docker build → GHCR push → GitOps update → Telegram |
| `deploy.yml` | Push to `main` (cloudflare-worker/** changes) | Deploy CF Worker via `wrangler deploy`            |

## Deployment

Static files are served from a Docker image (`nginx:alpine`) published to `ghcr.io/mctlhq/mctl-web`. The Cloudflare Worker handles all `/api/*` traffic. Domain: `mctl.ai`.

## Release Process

```bash
git tag 1.2.1 && git push origin 1.2.1
# → GitHub Actions builds ghcr.io/mctlhq/mctl-web:1.2.1
# → CI commits new tag to mctl-gitops → ArgoCD deploys
```

Worker changes deploy automatically on push to `main` when `cloudflare-worker/**` files change.

## Related Projects

| Repository | Description |
|------------|-------------|
| [mctl-api](https://github.com/mctlhq/mctl-api) | REST API + MCP server (Go) |
| [mctl-gitops](https://github.com/mctlhq/mctl-gitops) | GitOps source of truth + CLI (Helm, ArgoCD, Go) |
| [mctl-portal](https://github.com/mctlhq/mctl-portal) | Developer portal (TypeScript, Backstage) |
| [mctl-agent](https://github.com/mctlhq/mctl-agent) | Self-healing automation (Go, Claude API) |

## License

Apache 2.0
