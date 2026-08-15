# mctl-web

Public website (mctl.ai) — Nuxt 3 Vue SPA served by nginx + Cloudflare Worker for OAuth and form handling.

## Branch Strategy — HARD RULES

**NEVER commit directly to `main`.** Every change goes through a feature branch and a PR. No exceptions.

Workflow for every change:
1. `git checkout -b feat/description` (or `fix/`, `ci/`, `docs/`, `chore/`)
2. Make commits on the branch
3. `gh pr create` → wait for CI + Claude review
4. `gh pr merge <N> --merge --delete-branch`

**Forbidden on `main`:**
- Direct commits (`git commit` while on main)
- Cherry-picks onto main (`git cherry-pick`)
- Rebasing commits onto main
- Force pushes that bypass the branch+PR flow (rollback/hotfix force pushes are the only exception, and must be explicitly requested)

The git graph must show the "merge commit" pattern:
```
* Merge pull request #N from mctlhq/feat/description  ← main
|\
| * feat: my change                                    ← feature branch
|/
* previous commit on main
```

## Versioning & Deploy

- Tag format: `MAJOR.MINOR.PATCH` (no `v` prefix)
- Pushing a tag triggers `tag-deploy.yml` → builds image → deploys via ArgoCD
- For manual deploy: `mctl_deploy_service` MCP tool (team=admins, service=mctl-web)

## Stack

- **Nuxt 3** (`ssr: true`, prerendered static output) — source in `app/`
- **nginx** serves the prerendered output (`/usr/share/nginx/html`)
- **Cloudflare Worker** handles `mctl.ai/api/*` routes (OAuth, contact form, Telegram notifications)

## Conventions

- SCSS with design tokens in `app/assets/scss/` (`base.scss`, `_tokens.scss`)
- Components in `app/components/` (no path prefix — imported directly by name)
- i18n strings via `app/composables/useI18n.ts` (custom, not @nuxtjs/i18n)
- Onest for body (CDN `--font-display`), Instrument Serif for editorial, JetBrains Mono for code/terminal. Tokens from https://ui.mctl.ai/mctl.css; default accent is terracotta.
- No emoji in content unless explicitly requested
- English for all user-facing text

## Key Paths

- `app/pages/index.vue` — main landing page
- `app/components/main/` — hero, sections
- `app/assets/scss/` — design tokens and global styles
- `app/composables/useI18n.ts` — copy strings
- `cloudflare-worker/index.js` — Worker source
- `nginx.conf` — nginx configuration

## PR Review Flow

### Trivial changes — merge immediately
Config/values YAML, dependency bumps, docs/comments only, single-line typo fix.

### Non-trivial changes — Claude review gate
Claude reviews via `claude-review.yml` (runs on PR open). Address every P1/P2 finding before merging. Re-trigger with `@claude review` comment.

The reviewer runs on **Claude Opus** for quality. Opus draws on the shared
`CLAUDE_CODE_OAUTH_TOKEN` quota and on heavy review days can hit
"You've hit your limit". The workflow treats a usage-limit failure as
**transient** (non-blocking, posts a note) rather than a code defect — real
findings still block. After the quota window resets, re-run with `@claude review`.
