# Site onboarding review: sign-up, forms, emails, identity

Status: stage A in progress; stages B to D are an agreed design, not yet scheduled.
Reviewed: 2026-10-14.

This is the canonical review of the path from mctl.ai to a working workspace. It
covers the website copy, the forms, the welcome email, and how a new person gets
an identity that the portal and mctl-api accept. It replaces any earlier draft.

Commits read for the findings below:

| Repository | Commit |
|---|---|
| mctlhq/mctl-web | `158ad25` |
| mctlhq/mctl-api | `d9b8214` |
| mctlhq/mctl-portal | `12e8633` |
| mctlhq/mctl-gitops | `3eea692` |

Line numbers refer to those commits.

## 1. The core problem

The website signs people in with its own GitHub OAuth flow and asks the portal to
create a tenant. Nothing creates a ZITADEL account for that person. The portal
(`signIn: zitadel`) and mctl-api (`OAUTH_UPSTREAM: zitadel`) only accept ZITADEL
users, and today those users are declared by hand in Vault and created by the
zitadel-iac Terraform job. A new self-service user therefore gets a workspace they
cannot sign in to.

Cosmetic fixes to the site do not close this gap. Stages B and C do.

## 2. Confirmed findings

| Priority | Finding | Evidence |
|---|---|---|
| P1 | The site and welcome email point people to GitHub sign-in, while the portal and mctl-api accept only ZITADEL accounts. ZITADEL has registration off and no external IdP, and the portal requires the `mctl:github_login` claim, which only Terraform-declared users get. | `mctl-portal.yaml:396` and `:470-481`, `mctl-api.yaml:187`, `zitadel-iac/iac/login_policy.tf:34,52`, `zitadel-iac/iac/github-login.tf:101-132` (mctl-gitops) |
| P2 | After the provisioning request is accepted, the UI says "Team Created!". Nothing checks that provisioning finished. The portal writes the tenant row before the workflow starts, so checking that the tenant exists does not prove it is ready. | `app/components/main/request-access/SuccessModal.vue:10`, `app/composables/useI18n.ts:53`, `plugins/tenant-backend/src/router.ts` (mctl-portal) |
| P2 | The contact form shows errors but never shows success and never clears its fields. | `app/composables/useContactForm.ts:1-31`, `app/components/main/ContactForm.vue:36-40` |
| P2 | The identity the site hands to the browser is signed over the GitHub login only, has no server-side expiry, and the email and name used for the welcome email come from the request body. The email falls back to the public profile address when no verified one exists. | `cloudflare-worker/index.js:459,464,638-643,757-759` |
| P2 | The welcome email uses the old cyan design, says "© 2025", tells people to sign in with GitHub, and links to Argo CD. The Resend and Telegram responses are not checked. | `cloudflare-worker/index.js:872-971`, `:745-755`, `:958-970` |
| P2 | /docs mentions Dex and GitHub tokens. /privacy described one-hour browser-only tokens and Dex, while the portal keeps server-side sessions and mctl-api stores refresh-token hashes. | `app/pages/docs/index.vue:140,170,233,259`, `app/pages/privacy/index.vue:64-66,80,87` |
| P3 | Inputs use accent borders and monospace text, buttons glow, and the design-system CSS is loaded unversioned. | `BaseInput.vue:76,79`, `BaseTextarea.vue:35,38`, `BaseButton.vue:48,60`, `nuxt.config.ts:40` |
| P3 | The Turnstile widget has no theme, size or appearance options, and an expired or failed check is only reported on submit. | `app/composables/useTurnstile.ts:90-101` |
| P3 | When the "team already exists" check against the portal fails, the Worker logs a warning and continues. A failed read is treated as "no such team". | `cloudflare-worker/index.js:668-685` |

`static/docs/index.html` is not shipped: the Docker image copies only the
`nuxt generate` output. It still carries the old Dex wording and can be deleted.

## 3. Claims register

Each public claim, its source of truth, and what this stage does with it.

| Claim | Where | Source of truth | Status | Action |
|---|---|---|---|---|
| "1 team" (Starter) | `useI18n.ts` `pricing.starter.f1` | Portal config `maxTeamsPerTenant: 1` limits teams inside a tenant. The Worker only refuses a team name that already exists. No per-account workspace limit was found. | Unverified | Replaced with "Team workspace" |
| "2 services" (Starter) | `pricing.starter.f2` | Not found anywhere. The tenant quota is `services: 10`, which counts Kubernetes Services. | Unverified | Replaced with "Isolated namespace with quotas" |
| "No shared-cluster risk" | `why.card3.desc` | Tenants share one cluster with namespace isolation; the Starter plan also says "Shared infrastructure". | Contradicted | Reworded to "on a shared cluster" |
| "instantly" | `how.step1.desc` | Provisioning is an Argo workflow that takes minutes. | Overstated | Reworded |
| "20+ MCP tools · 7 AI clients" | `features.card5.code`, /docs | The tool list depends on the caller's permissions and changes per release. | Unverifiable as a number | Numbers removed |
| "SSO via GitHub" | `why.card5.desc`, `features.card3.desc` | Platform sign-in is ZITADEL. | Outdated | "single sign-on" |
| `mctl ask` in the hero | `HeroBlock.vue:50` | No such CLI command was found. | Unverified | Replaced with an MCP prompt calling `mctl_rollback_service` |
| "Every action flows through mctl-api" | /docs | The portal starts workflows itself. | Overstated | "through mctl-api or the portal" |
| "Authenticate with GitHub token or Dex JWT" | /docs | mctl-api accepts its own OAuth tokens (`mctl auth login`); GitHub tokens are deprecated (mctl-api#525). | Outdated | Updated |

## 4. Identity model (decided 2026-10-14)

GitHub becomes an external identity provider inside ZITADEL. People always click
"Continue with GitHub". On first sign-in ZITADEL creates an account whose login
name is `<github-login>@mctl.ai`. That is a login name, not a mailbox: the
account's email is the person's verified GitHub address.

The chain that every later stage must keep intact:

```
GitHub numeric id --(GitHub OAuth through the ZITADEL IdP)--> ZITADEL subject (org "customers")
        |
        +-- mctl-api: GitHub identity by numeric id + linked ZITADEL identity --> principalId
                                                                                     |
        create-tenant workflow: members[{principalId, userId: login, catalogKey: principal}]
                                                                                     |
        portal: User entity named by principalId; Group members by principalId; login is display only
```

The GitHub login is never an access key. A rename keeps the numeric id, the
ZITADEL subject, the principal and the catalog entity. A login released by one
person and taken by another maps to a different id, principal and entity.

Facts this design relies on:

- mctl-api maps a ZITADEL sign-in to a principal by `(provider, issuer, subject)`
  only and never reads `mctl:github_login` (`internal/api/oauth_upstream.go:323-324`,
  `internal/principals/signin.go:54-121`). In principal mode an unknown subject is
  auto-provisioned as a ZITADEL-only principal (`internal/api/oauth_signin_principal.go:49-81`).
- GitHub identities are stored by numeric id (`internal/principals/store.go:77-105`).
  `LinkIdentity` reports linked, already linked, owned elsewhere, revoked and
  disabled separately (`internal/principals/link.go:93-160`).
- The portal signs a ZITADEL user in as `user:default/<mctl:github_login>`
  (`packages/backend/src/zitadelAuthModule.ts:74-108`). Tenant sync reads only
  `userId` and `role` from members, and catalog users and group members are keyed
  by `userId` (`plugins/tenant-backend/src/tenantSync.ts:206-211`,
  `plugins/tenant-backend/src/catalogEntities.ts:129-155`).
- ZITADEL Actions: only External Authentication / Post Authentication sees the
  external user (`externalId`, `externalIdpId`, `preferredUsername`). Complement
  Token actions read stored metadata and the client id.

## 5. Stages

### Stage A: website only (this work)

- **A1. Review and copy.** This document; the copy changes in section 3; /privacy
  and /docs brought in line with how sign-in and sessions work today. No promise of
  a future sign-in path.
- **A2. Forms.** Contact form success state and reset after success only. API
  responses checked. The workspace modal says "Provisioning request accepted" and
  does not poll. Turnstile theme, flexible size, interaction-only appearance, and a
  visible expired or failed state. Design CSS pinned to
  `https://ui.mctl.ai/0.5.0/mctl.css`; neutral `--color-line` borders, Onest in
  inputs, no glow. Form API URLs configurable so local testing never hits production.
- **A3. Welcome email.** Redesigned in the terracotta, paper and ink palette with
  inline styles, one call to action, the current year and a plain-text part. No
  sign-in instructions until stage C ships. Resend and Telegram results are checked
  independently and reported as `emailStatus: accepted | failed | skipped`; an
  accepted workspace request is never turned into an error by a notification failure.

### Stage B: ZITADEL organization "customers" (mctl-gitops, zitadel-iac)

- **B1.** Org `customers` with the `mctl.ai` domain; GitHub IdP with auto-creation
  and auto-update, linking and auto-linking off; org login policy with GitHub only,
  `user_login=false`, and MFA enforced for local logins only (admins keep the
  current default policy).
  - A Post Authentication action checks the IdP id, then stores `github_id` and
    `github_login` metadata and the preferred username on every sign-in.
  - A Complement Token action emits `mctl:org`, `mctl:idp`, `mctl:github_id` and
    `mctl:github_login` only for listed client ids. It emits only `mctl:refused`
    when the id is missing or the login is reserved by an existing admin or tenant user.
  - A separate `mctl-web` project and OIDC client, and a separate `mctl-web-dev`
    project that no production allowlist accepts.
  - No project grants to the portal or mctl-api yet: customer accounts cannot use
    them until C0 and C2 are live.
- **B1b.** Grant the `customers` org access to the portal and mctl-api projects.

### Stage C: principals, portal, website session

- **C0 (mctl-api).** For tokens whose resource owner is the `customers` org:
  require the GitHub claims, provision the GitHub identity by numeric id and link
  the ZITADEL subject to it; any missing claim, refusal or link conflict is a
  refusal, never the old path and never auto-provisioning.
  - Applied in the OAuth callback, the bearer path, and a new portal-surface
    endpoint `POST /api/v1/surface-principals/zitadel`.
  - The endpoint accepts a site token (`purpose=create`, audience and `azp` =
    mctl-web) or a portal token (`purpose=signin`, audience and `azp` = portal).
  - Ships before mctl-api switches to principal mode (mctl-api#377).
- **C2 (mctl-portal, mctl-gitops).** The create-tenant workflow records
  `catalogKey: principal` for customer owners. The portal stores `principal_id`
  and `catalog_key`, names principal-keyed User entities and group members by
  principalId, and signs customer accounts in by principalId resolved through C0.
  - Portal-originated tenant creation (the no-tenant page and the Backstage
    template) takes the creator from the server-side identity, not from the request body.
  - New availability endpoint for the website.
- **C1a (Worker).** New `/api/auth/*`, `/api/team/check` and a cookie branch of
  `/api/submit`, alongside the unchanged legacy GitHub flow.
  - Server-side sessions in Workers KV behind an opaque `__Host-` cookie; the ID
    token never reaches the browser. Sessions last up to 8 hours.
  - Every cookie request re-presents the ID token to the portal and mctl-api, so a
    revoked identity or disabled principal is refused on the next request.
  - CSRF protection (Origin plus a custom header) on the cookie branch only.
  - A server-side test-group allowlist by GitHub numeric id until the public switch.
- **C1b (site).** The new sign-in UI behind `?auth_flow=zitadel`, legacy by
  default. A later small flip makes it the default and updates /privacy, /docs and
  the welcome email.
- **C1c.** Remove the legacy GitHub OAuth flow, the HMAC identity and the
  login-keyed landing creator.

Rollout order: A1, A2, A3, then B1, C0, C2, C1a, C1b, then B1b. Next a test-group
run through sign-up, workspace, portal and MCP, including a reused login, a rename
and a revoked identity. Then the public flip, C1c, and finally D1.

### Stage D: ZITADEL texts and emails

- **D1.** Login and message texts for the `customers` org in the site's tone.
  Confirm in practice that auto-creation with a verified email sends no mail, and
  attach samples of any email that does go out.

### Out of the first release

- Argo CD, Argo Workflows and kubectl grants for self-service owners. These need
  revocation and tenant-deletion handling first.
- Forwarding `<login>@mctl.ai` as a real mailbox.
- Passkeys or other local sign-in for customer accounts.
- Moving existing login-keyed users to principal-keyed catalog entities.

## 6. Open owner decisions (before B1)

1. Create the GitHub OAuth app for the ZITADEL IdP and store its secret in Vault.
2. Confirm that customer accounts signing in with GitHub need no second factor,
   and that the first version offers no local sign-in or passkeys.
3. Confirm the `mctl.ai` domain for the `customers` org.
4. Confirm that C0 ships before mctl-api switches to principal mode.
5. Name the test group by GitHub numeric id.

## 7. Done criterion

A new person goes from mctl.ai through sign-up to a workspace, then signs in to
the portal and connects an MCP client, with no manual Vault entry and no manual
membership fix.
