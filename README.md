# mctl-web

Landing page for the mctl.ai platform.

## What It Does

mctl-web serves the public-facing website for mctl.ai — a landing page and documentation. MCP connector setup is at docs.mctl.ai/mcp/connecting. The Nuxt 4 SPA runs in an nginx container while a Cloudflare Worker handles the serverless API (OAuth, form submissions, team checks).

## Architecture

```
                        ┌─────────────────────────────────┐
                        │      Nuxt SPA Layer (nginx)      │
                        │                                  │
  Browser ─(HTTPS)────► │  /           → SPA (index.html)  │
                        │  /docs       → SPA (docs page)   │
                        │  /_nuxt/*    → immutable assets   │
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
| Frontend   | Nuxt 4 SPA (Vue 3, `<script setup>`, TypeScript)              |
| Styling    | SCSS partials, CSS variables, dark theme, JetBrains Mono      |
| i18n       | Custom composable (`useI18n`) — en/ru, domain-aware           |
| Worker     | Cloudflare Worker (Node.js runtime via wrangler)               |
| Server     | nginx Alpine (SPA fallback, security headers, caching)         |
| Container  | Docker multi-stage: node:22-alpine builder → nginx:alpine      |
| CI/CD      | GitHub Actions → GHCR → ArgoCD (site), wrangler (worker)      |
| Registry   | ghcr.io/mctlhq/mctl-web                                       |

## Project Structure

```
mctl-web/
├── app/
│   ├── assets/scss/
│   │   ├── base.scss               # CSS variables, resets, @use imports
│   │   ├── _layout.scss            # navbar, footer, container, responsive
│   │   ├── _components.scss        # buttons, forms, modals, code blocks
│   │   ├── _sections.scss          # hero, features, pricing, how-it-works
│   │   └── _utilities.scss         # reveal animation, focus-visible
│   ├── composables/
│   │   ├── useI18n.ts              # en/ru translations, locale switching
│   │   ├── useAuth.ts              # GitHub OAuth state, localStorage (8h TTL)
│   │   ├── useTeamValidation.ts    # team name regex + debounced availability check
│   │   └── useApi.ts               # submit/contact form wrappers
│   ├── plugins/
│   │   └── directives.ts           # v-reveal (IntersectionObserver → .visible)
│   ├── components/
│   │   ├── AppHeader.vue           # fixed navbar, burger menu, scroll lock
│   │   ├── AppHeaderNav.vue        # nav links with active state, GitHub icon
│   │   ├── AppFooter.vue           # footer with links
│   │   └── main/
│   │       ├── HeroBlock.vue
│   │       ├── RequestAccessForm.vue
│   │       ├── SuccessModal.vue
│   │       ├── WhySection.vue
│   │       ├── OrchestrationDiagram.vue
│   │       ├── FeaturesSection.vue
│   │       ├── AudienceSection.vue
│   │       ├── TechStackSection.vue
│   │       ├── HowItWorksSection.vue
│   │       ├── PricingSection.vue
│   │       └── ContactSection.vue
│   ├── layouts/
│   │   └── default.vue             # AppHeader + slot + AppFooter
│   └── pages/
│       ├── index.vue               # landing page (assembles all sections)
│       ├── docs/index.vue          # platform documentation
│       └── mcp/index.vue           # MCP connector (auth + client configs)
├── public/
│   └── img/                        # SVG icons, og-image, favicon
├── static/
│   ├── css/                        # shared CSS (used by nothing now — legacy)
│   └── img/                        # original images (public/img is canonical)
├── cloudflare-worker/
│   ├── index.js                    # Worker logic (OAuth, forms, proxy)
│   ├── wrangler.toml               # Routes, env vars
│   └── README.md                   # Worker setup guide
├── nuxt.config.ts                  # ssr:false, prerender crawlLinks, head meta
├── Dockerfile                      # multi-stage: node builder → nginx:alpine
├── nginx.conf                      # SPA fallback, immutable /_nuxt/ cache, headers
├── .env.example
└── .github/workflows/
    ├── build.yml                   # Docker build on semver tags/PRs
    └── deploy.yml                  # CF Worker deploy on main
```

## Getting Started

### Prerequisites

- Node.js 22+
- Docker
- [wrangler](https://developers.cloudflare.com/workers/wrangler/) (for worker development)

### Local Development

```bash
npm install
npm run dev          # Nuxt dev server at http://localhost:3000
```

### Build and Preview

```bash
npm run generate     # static export to .output/public/
npx serve .output/public
```

`npm run generate` builds in production mode, so it bakes in the **production**
Turnstile sitekey — whose hostname allowlist excludes localhost. The contact
and request-access forms will therefore refuse every submission in a local
preview. Copy `.env.example` to `.env` (it carries Cloudflare's always-passes
test key) before generating, or set it inline:

```bash
NUXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run generate
```

`npm run dev` needs none of this — it defaults to the test key already.

### Docker

```bash
docker build -t mctl-web .
docker run -p 8080:80 mctl-web
open http://localhost:8080
```

The image build has the same constraint as `npm run generate` above, and
`.dockerignore` excludes every `.env*` file, so the env var cannot reach it
that way. For a container whose forms work on localhost, pass the test key as
a build arg:

```bash
docker build --build-arg NUXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA -t mctl-web .
```

Omitting the arg is correct for real builds — it falls back to the production
sitekey.

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

- SPA fallback: all routes served via `200.html` (Nuxt SPA entry)
- `/_nuxt/` assets: immutable 1-year cache
- Security headers: HSTS (1 year), strict CSP, X-Frame-Options
- Health endpoints: `/healthz`, `/readyz`

## Pages

| Path    | Description                                                                    |
| ------- | ------------------------------------------------------------------------------ |
| `/`     | Landing page — hero, features, pricing, access request form, contact form      |
| `/docs` | Platform documentation — overview, architecture, components, quick start       |

## OAuth Flow

The MCP connector page (docs.mctl.ai/mcp/connecting) uses GitHub OAuth to issue a personal token. The GitHub `access_token` is never placed in a URL (query or fragment). After the callback, the Worker stores the payload server-side (Cache API, 5 min TTL) and in an encrypted HttpOnly cookie, then redirects to `docs.mctl.ai/mcp/connecting#session=<opaque-id>`. The connector page redeems the session with `POST /api/github/session`. Landing-page identity (no token) is delivered in the `#auth=` fragment so it never reaches server logs or Referer headers.

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
      │                       │  store session (cookie │
      │                       │  + cache); sign login  │
      │◄──────────────────────│                        │
      │  302 → docs.mctl.ai/  │                        │
      │  mcp/connecting       │                        │
      │  #session=<opaque-id> │                        │
      │──────────────────────►│                        │
      │  POST /api/github/    │                        │
      │  session {code}       │                        │
      │◄──────────────────────│                        │
      │  JSON payload (once)  │                        │
```

## Security

| Measure          | Implementation                                                       |
| ---------------- | -------------------------------------------------------------------- |
| CSRF             | State param signed with HMAC-SHA256, stored in HttpOnly cookie (5 min TTL) |
| Identity         | GitHub login signed with HMAC — landing `#auth=` fragment cannot be forged |
| Token exposure   | GitHub `access_token` never placed in a URL; one-time session via HttpOnly cookie and `POST /api/github/session` |
| CORS             | Landing API restricted to `https://mctl.ai`; session redeem also allows docs/telegram origins |
| CSP              | Strict Content-Security-Policy headers via nginx                     |
| HSTS             | Enabled, max-age 1 year                                             |
| Rate limiting    | 5 requests / 5 minutes on `/api/submit`                             |

## Testing

Worker OAuth helpers: `node --test cloudflare-worker/oauth.test.mjs`. Manual verification against production OAuth flow for the full GitHub round-trip.

## CI/CD

| Workflow     | Trigger                                     | Action                                            |
| ------------ | ------------------------------------------- | ------------------------------------------------- |
| `build.yml`  | Semver tags (`*.*.*`) + pull requests       | Docker build → GHCR push → GitOps update → Telegram |
| `deploy.yml` | Push to `main` (cloudflare-worker/** changes) | Deploy CF Worker via `wrangler deploy`            |

## Deployment

The site is served from a Docker image (`nginx:alpine`) published to `ghcr.io/mctlhq/mctl-web`. The Nuxt SPA is generated with `npm run generate` and bundled into the image. The Cloudflare Worker handles all `/api/*` traffic. Domain: `mctl.ai`.

## Release Process

```bash
git tag 4.1.0 && git push origin 4.1.0
# → GitHub Actions builds ghcr.io/mctlhq/mctl-web:4.1.0
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
