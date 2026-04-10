# mctl-web

Public website (mctl.ai) + Cloudflare Worker for OAuth and form handling.

## Workflow
- **All changes go through a branch** — for any fix, feature, or refactor: create a `feat/` or `fix/` branch, make changes there, then merge to `main`
- **After merging, create a new semver tag and push it** — this triggers the CI/CD deploy pipeline
- Tag format: `MAJOR.MINOR.PATCH` (no `v` prefix)

## Stack
- Static HTML/CSS/JS, no frameworks
- nginx serves static files
- Cloudflare Worker handles `/api/*` routes (OAuth, contact form, Telegram)

## Conventions
- Shared CSS in `static/css/style.css` (modular: base, layout, components, sections, utilities)
- Page-specific styles: inline `<style>` block (minimal additions only)
- JetBrains Mono font throughout
- CSS variables defined in `base.css` (colors, spacing)
- No emoji in content unless explicitly requested
- English for all user-facing text

## Pages
- `/` — landing page (`static/index.html`)
- `/docs/` — platform documentation (`static/docs/index.html`)

## Key Paths
- `static/css/modules/` — CSS module files
- `static/js/` — JS modules (nav, auth, forms, i18n)
- `cloudflare-worker/index.js` — Worker source
- `nginx.conf` — nginx configuration
