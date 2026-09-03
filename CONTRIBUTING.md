# Contributing to mctl-web

Thank you for your interest in contributing to mctl-web! This guide will help you get started.

## Prerequisites

- **nginx** (or any static file server) for local development
- **Node.js** (v18+) for Cloudflare Worker development
- **Git**

## Local Development

### Static Site

The simplest way to run the site locally is to serve the `static/` directory:

```bash
# Using nginx (configure root to point at static/)
nginx -c /path/to/your/nginx.conf

# Or use any static server
npx serve static/
python3 -m http.server -d static/
```

### Cloudflare Worker

To develop the Worker locally:

```bash
npx wrangler dev
```

This starts a local dev server that handles Worker routes (`/api/*`).

## Project Structure

### Pages

| Path     | Description                |
|----------|----------------------------|
| `/`      | Landing page               |
| `/docs/` | Documentation              |

### CSS

Stylesheets follow a modular architecture:

- `static/css/style.css` — shared base styles
- `static/css/modules/` — page-specific and component modules

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark mode toggle
fix: correct mobile nav overflow
docs: update deployment instructions
style: reformat CSS modules
refactor: extract header component
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`.

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
3. Make your changes and commit using conventional commits
4. **Push** your branch and open a Pull Request against `main`
5. Fill out the PR template
6. PRs are merged with a **merge commit** (`gh pr merge --merge --delete-branch`), never squash. The feature branch must stay visible in the git graph.

## Code Review

- All PRs require at least one approving review
- CI checks must pass before merging
- Keep PRs focused — one feature or fix per PR

## Questions?

Open a [discussion](https://github.com/mctlhq/mctl-web/discussions) or reach out via an issue.
