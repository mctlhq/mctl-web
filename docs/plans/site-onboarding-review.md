# Site onboarding review: sign-up, forms, emails, identity

Status: stage A done and released in mctl-web 7.6.0 (2026-10-14). Stage B is
prepared but not started; stages C and D are an agreed design, not yet scheduled.
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
| P2 | The identity the site hands to the browser is signed over the GitHub login only, has no server-side expiry, and the email and name used for the welcome email come from the request body. The email falls back to the public profile address when no verified one exists. | `cloudflare-worker/index.js:459,464,638-643,757-759`; tracked in mctl-web#133, to be fixed before the public launch of stages B/C |
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
- ZITADEL runs v4.19.2 with the Login V2 UI (chart 10.3.0 in
  `bootstrap/templates/core-infra/zitadel.yaml`; OpenTofu provider 3.8.7). Read
  at that tag:
  - Login V2 does not run Actions v1 in the external authentication flow; those
    triggers exist only in the Login V1 handlers (`internal/api/ui/login/custom_action.go`).
    Hooks on an IdP login are Actions v2 executions: a response execution on
    `UserService/RetrieveIdentityProviderIntent`, request executions on the user
    creation methods, and the `preuserinfo` / `preaccesstoken` functions at token
    time. Actions v1 is planned to be removed in ZITADEL v5.
  - Execution conditions select an API method, a service, a function or an event;
    there is no organization filter (`proto/zitadel/action/v2/execution.proto`).
    Every execution is instance-wide, so a hook that is down or rejects with
    `interruptOnError` affects admins and every other org too, not only
    `customers`.
  - Login V2 has two creation paths for an IdP user: automatic creation calls
    `CreateUser` (`apps/login/src/lib/server/idp-intent.ts:675`), and the
    "complete registration" form calls `AddHumanUser` (`lib/server/register.ts`).
  - A repeat sign-in with auto-update calls `UpdateUser`, and Login V2 logs a
    failed update and continues the login (`idp-intent.ts:470-483`). That update
    does not change the username.
  - The GitHub provider takes the public profile email from `GET /user` first and
    reads `GET /user/emails` only when that is empty. It reports every GitHub
    email as verified (`internal/idp/providers/github/session.go`, `github.go`).
  - GitHub users have no first or last name in ZITADEL, so with auto-creation
    Login V2 always shows the "complete registration" form. That form requires
    `allowRegister`, lets the person edit the email, stores it unverified, and
    uses the email as the username (`apps/login/src/lib/server/idp-intent.ts`,
    `components/register-form-idp-incomplete.tsx`, `lib/server/register.ts`).
  - An org login policy replaces the instance policy. `force_mfa` overrides
    `force_mfa_local_only`, and the instance policy has `force_mfa = true`, so
    today every GitHub login would be asked for a second factor.

## 5. Stages

### Stage A: website only (done)

Released in mctl-web [7.6.0](https://github.com/mctlhq/mctl-web/releases/tag/7.6.0)
on 2026-10-14: A1 in #128, A2 in #129, A3 in #130, release PR #131. Deferred
review nits are in #132. The legacy identity finding from section 2 is not part of
stage A and is tracked as a P2 in #133.

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

Product decision for v1: customer accounts are GitHub-only. ZITADEL asks for no
additional second factor on top of the GitHub sign-in. GitHub may enforce its own
second factor, but mctl does not claim that every customer passed MFA. Customer
accounts have no local password, passkey or other recovery method, so a customer
who loses access to GitHub recovers it through GitHub. All of this applies to the
`customers` org only; admin accounts keep the current instance policy unchanged
([ZITADEL default settings](https://zitadel.com/docs/guides/manage/console/default-settings)).

Because of the Login V2 facts in section 4, the earlier Actions v1 design does
not work, and ZITADEL's own GitHub email is not trustworthy. B1 is preceded by a
spike.

- **B0. Spike.** On a separate ZITADEL instance of the same version (v4.19.2,
  Login V2), not on production: executions are instance-wide, so a throwaway org
  on production does not isolate the experiment, and a failing hook there could
  lock out admins. The spike instance has two orgs, a `customers` org with the
  GitHub IdP and an admin-like org with a local user, plus a web client and a
  portal-like client. With test GitHub accounts, confirm and record here:
  1. **Creation without the form.** Whether a response execution on
     `RetrieveIdentityProviderIntent` that fills the name, email and verified flag
     makes Login V2 take the automatic `CreateUser` path instead of the "complete
     registration" form, and which username and email state the user gets.
  2. **GitHub data in the hook.** The intent response carries the GitHub access
     token and numeric id, so the hook can call `GET /user/emails` itself.
  3. **Every creation path is blocked.** A request execution with
     `interruptOnError` on `CreateUser` blocks the automatic path, and one on
     `AddHumanUser` blocks the form path, so a refused person cannot create an
     account through the other path either. Record what the person sees.
  4. **Repeat sign-in.** After a GitHub rename, and with the hook made to fail
     during `UpdateUser`, a repeat sign-in must not end with a token that carries
     stale trusted data. Login V2 continues past a failed update, so either the
     token-time function re-checks against the stored identity and refuses, or
     the update path is proven to stop the login. Also record that the username
     does not change on rename.
  5. **ID token, not only userinfo.** The claims C0 needs are present in the
     signed ID token issued to the web client and to the portal client, not only
     in an access token or `/userinfo`. A refusing or failing token-time hook
     prevents that ID token from being issued.
  6. **Failure blast radius.** With the hook unreachable: customer sign-in and
     creation are refused; the admin-like org's local login, token issuance and
     user creation by a service account (the zitadel-iac path) are recorded. If
     they are blocked too, B1 needs a design that does not put admin sign-in
     behind the hook (for example `interruptOnError` off for paths that admins
     use, with the refusal enforced at token time and in C0), and that design is
     tested again in B0.
  If item 1, 3, 4 or 5 fails, B1 is redesigned before any code (for example a
  custom registration step), not worked around.
- **B1.** Org `customers` with the `mctl.ai` domain; GitHub IdP with auto-creation
  and auto-update, linking and auto-linking off; an org login policy that restates
  every field because it replaces the instance policy: GitHub as the only IdP,
  `user_login=false`, `force_mfa=false` with `force_mfa_local_only=true`, and
  passkeys not allowed. `allow_register` only if B0 shows the creation path needs it.
  - An identity hook, an Actions v2 target with signed payloads. Because
    executions are instance-wide, the hook itself passes through every request
    that is not for the GitHub IdP of `customers`. On the intent response it reads
    the numeric id, fetches the verified email (rule below), sets the name
    (falling back to the login when GitHub has none) and the username
    `<login>@mctl.ai`. On every creation path it refuses a person with no
    verified email, or whose login is reserved by an existing admin or tenant
    user or is a service login. How it behaves when unreachable is set by B0
    item 6, not assumed.
  - A token-time function puts `mctl:org`, `mctl:idp`, `mctl:github_id` and
    `mctl:github_login` into the ID token only for listed client ids, and only
    `mctl:refused` when the id is missing or the login is reserved. Because a
    failed update does not stop a repeat sign-in, the token-time function is
    where stale data is caught; claims are never taken on trust from a previous
    update alone.
  - Where the hook runs is an owner decision (section 6). The preliminary choice
    is mctl-api: a dedicated endpoint that checks the ZITADEL payload signature
    and the request age, and does not depend on a user OIDC sign-in to handle the
    call. The final choice waits for B0 items 5 and 6.
  - A separate `mctl-web` project and OIDC client, and a separate `mctl-web-dev`
    project that no production allowlist accepts.
  - No project grants to the portal or mctl-api yet: customer accounts cannot use
    them until C0 and C2 are live.
  - Email: the account email is only GitHub's primary verified address from
    `GET /user/emails`, fetched by the hook. The public profile email is never
    treated as verified, and `<login>@mctl.ai` is never used for delivery. With
    no verified address, v1 stops registration with a clear instruction: verify
    an email address in GitHub, then sign in again. An account whose email is
    hidden from the public profile but verified must work normally.
  - Acceptance criteria, all on production ZITADEL with test GitHub accounts:
    1. A first sign-in creates `<login>@mctl.ai` in `customers` with `github_id`
       and `github_login` metadata, and asks for no ZITADEL second factor.
    2. A repeat sign-in returns the same ZITADEL subject.
    3. After a GitHub rename, the next sign-in returns the same subject and
       `github_id`, updates `github_login`, and creates no second user.
    4. A login reserved by an admin or an existing tenant user, or a service
       login, gets `mctl:refused` and a clear refusal page, not a half-created
       session.
    5. A token issued to `mctl-web-dev` is refused by every production client
       allowlist (mctl-api, the portal, the Worker).
    6. Before B1b, a customer account cannot sign in to the portal or mctl-api.
    7. A GitHub account with an empty display name completes sign-up. If ZITADEL
       shows its profile-completion screen
       ([GitHub IdP guide](https://zitadel.com/docs/guides/integrate/identity-providers/github)),
       the screen is recorded and covered by D1 texts.
    8. A GitHub account with a hidden email signs up with its verified address;
       one with no verified email is stopped with the instruction above and no
       user is created.
    9. With the hook unreachable, customer sign-in is refused and no customer
       is created, and admin sign-in behaves as B0 item 6 decided.
    10. A repeat sign-in after a failed profile update never yields an ID token
        with stale `mctl:github_login` or a missing refusal.
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
  - Ordering is a condition, not a date: C0 is live and verified before any
    customer gets portal or API access (B1b) and before mctl-api switches to
    principal mode (mctl-api#377). That switch is planned for no earlier than
    2026-10-19, after the shadow window, B7 and a live check; if C0 or its
    dependencies are not ready by then, the switch waits.
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

Rollout order: A1, A2, A3 (done), then B0, B1, C0, C2, C1a, C1b, then B1b. Next a
test-group run through sign-up, workspace, portal and MCP, including a reused
login, a rename and a revoked identity. The P2 fix in mctl-web#133 lands before
the public flip. Then the public flip, C1c, and finally D1.

The test group is the owner's choice. The owner names GitHub logins; the
implementer resolves them to numeric ids and pins those in the server-side
allowlist. The group includes at least one new account that is not an admin
and not an existing tenant user.

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
2. Confirm the v1 product decision in stage B: GitHub-only customer accounts, no
   additional ZITADEL MFA in the `customers` org, no local sign-in, passkeys or
   recovery method, recovery through GitHub.
3. Confirm the `mctl.ai` domain for the `customers` org.
4. Confirm the ordering condition: C0 is verified before B1b and before the
   mctl-api#377 switch, and the switch moves if C0 is not ready.
5. Name the test group by GitHub login, including a new non-admin account.
6. Where the identity hook runs. Preliminary: mctl-api, final after B0.
7. A separate ZITADEL v4.19.2 instance for B0 (where it runs, for how long).

## 7. Done criterion

A new person goes from mctl.ai through sign-up to a workspace, then signs in to
the portal and connects an MCP client, with no manual Vault entry and no manual
membership fix.
