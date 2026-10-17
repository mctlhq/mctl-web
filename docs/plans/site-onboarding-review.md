# Site onboarding review: sign-up, forms, emails, identity

Status: test-group onboarding production acceptance complete (2026-10-17).
Stage A and the signed-identity fix (#133, #136, #137) are released. B0 and local
hook validation completed; B1 creation/token gates, C0 and C2 are deployed.
C1a/C1b are released behind the test-group/UI switches (web #147/#149).
Web 7.8.1 adds a cleared form and acceptance receipt after successful submit.
B1b grants and the API claim-client rollout are applied. The missing portal
client-audience setting found by live sign-in is corrected and rolled out.
The test-group workspace creation and principal-keyed portal sign-in are verified.
The test-group MCP sign-in and own/foreign workspace authorization are verified.
D1 locale rollout, D2 Access/ready notification, and customer MCP acceptance are verified in production.
Public cutover, Stage E, legacy retirement, and optional hardening are planned in
[Post-acceptance roadmap](#post-acceptance-roadmap-2026-10-17).
The findings below describe the original audit unless a later record says
otherwise; implementation is not evidence of successful live acceptance.

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

### Worked example: what a new customer gets

GitHub user `github_user` signs in on mctl.ai and asks for
workspace `acme`:

1. ZITADEL creates account `github_user@mctl.ai` in org `customers`. This is
   only a login name: **no mailbox is created**, and mail goes to the verified
   GitHub address.
2. mctl-api resolves the account to a principal through the numeric GitHub id.
3. The create-tenant workflow (stage C2) writes `members: [{userId: github_user,
   principalId: <prn>, role: owner, catalogKey: principal}]` to
   `tenants/acme/values.yaml`. The tenant chart creates the namespaces `acme` and
   `acme-preview`. The portal names the catalog user by `principalId`; `userId`
   is display only.
4. `github_user` signs in to the portal and connects an MCP client as owner of
   `acme`. In v1 that is all they get: no Argo CD, Argo Workflows, kubectl,
   Vault or Grafana access.

Access per resource in v1. Paths are in mctl-gitops `platform-gitops/` at
`ad93116` unless they name another repo.

| Resource | Granted automatically in v1 | Mechanism and source |
| --- | --- | --- |
| ZITADEL account `<login>@mctl.ai` | Yes | Created on first GitHub sign-in (stage B) |
| Mailbox `<login>@mctl.ai` | No | Not created; forwarding is out of the first release |
| Portal `app.mctl.ai` | Yes, after C2 and B1b | Catalog user and group membership keyed by `principalId` (`catalogKey: principal`, stage C2) |
| MCP `api.mctl.ai/mcp` and mctl-api | Yes, after C0 and B1b | `members` matched by `principalId` only; the caller's principal comes from C0 |
| Namespaces `<ws>`, `<ws>-preview` | Yes (as resources, not as kubectl access) | Tenant chart; preview behind `tenant.preview.enabled`, default `true` (`helm-charts/tenant/values.yaml:122-123`) |
| ResourceQuota, LimitRange, NetworkPolicies | Yes | `helm-charts/tenant/templates/{resourcequota,limitrange,networkpolicy}.yaml` |
| Vault paths and ESO store | Yes, for workloads only | Policies and Kubernetes auth roles in `wft-create-tenant.yaml:539-614`; `SecretStore tenant-store` |
| Vault human login | No | Opt-in `vault: true` per user (`zitadel-iac/iac/vault.tf:79-80`) |
| Workflow service accounts and RBAC | Yes, for workloads only | `helm-charts/tenant/templates/argo-workflow.yaml` |
| Argo CD `ops.mctl.ai` | No | Per-tenant CSV `argocd/rbac/tenants/<t>.csv` exists, but the role reaches a user only with `argocd: true` (`zitadel-iac/iac/argocd.tf:94`) |
| Argo Workflows `workflows.mctl.ai` | No | `sso-team-<t>`, view only, but `sso-team-logs` also allows `secrets: get` in the namespace; opt-in `workflows: true` (`workflows.tf:79`) |
| kubectl | No | Chart `kubectlAccess.enabled: false` (`values.yaml:149-150`) and per-user `kubectl: true` (`kubernetes.tf:92-93`) |
| Grafana | No | Admins only (`zitadel-iac/iac/grafana.tf:3-9`) |
| Databases and applications | No | Tenant creation deploys no workload; separate operations |

The opt-in flags above are read from Vault `secret/platform/zitadel/users/<tenant>`,
which zitadel-iac uses for tenant orgs. Customer accounts live in org `customers`
and are not in that path, so none of these flags can reach them in v1. The
`members` list is read only by the portal and mctl-api; zitadel-iac, the tenant
chart and Argo CD RBAC never read it.

Starting state, for contrast (legacy, login-keyed, still used by admins and
existing tenants): the portal keys catalog users by `userId` and reads only
`userId` and `role` (`mctl-portal plugins/tenant-backend/src/tenantSync.ts:206-211`,
`catalogEntities.ts:129-155`), and mctl-api matches `members` by GitHub login or
`principalId` (`mctl-api internal/gitops/reader.go:94-200`). Customer accounts
must never be matched by login; that is what stages C0 and C2 change.

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
  4. **Where fresh GitHub data comes from.** Comparing a token-time hook with
     metadata written by the same failed update proves nothing, because both stay
     stale. Record the independent source of the GitHub numeric id and login at
     each point and how it is bound to the current sign-in: the IdP intent of a
     new GitHub login, the user's IdP link, metadata. Check token issuance in
     three cases: a new GitHub login after a rename with `UpdateUser` made to
     fail, a ZITADEL session reused with no new GitHub login, and a refresh token.
     The expected outcome is that the numeric id in every ID token is the one
     bound to the account at creation and never changes, while the login may lag
     behind GitHub and is display only. If the numeric id cannot be read from a
     source bound to the account, B1 is redesigned. Also record that the
     username does not change on rename.
  5. **ID token, not only userinfo.** The claims C0 needs are present in the
     signed ID token issued to the web client and to the portal client, not only
     in an access token or `/userinfo`. A refusing or failing token-time hook
     prevents that ID token from being issued.
  6. **Failure blast radius.** With the hook unreachable, record for both orgs:
     sign-in, token issuance (new session, reused session, refresh) and user
     creation, including creation by a service account (the zitadel-iac path).
     Two conditions must hold at the same time: admins keep signing in and
     getting tokens, and no unverified customer account is created. Turning
     `interruptOnError` off on the creation path does not meet the second
     condition, because the account would exist even if C0 later refuses it,
     and a global token-time hook can block admins. If B0 cannot show both
     conditions together, B1 is redesigned; no workaround counts as the answer
     until B0 has shown it.
  If item 1, 3, 4, 5 or 6 fails, B1 is redesigned before any code (for example a
  custom registration step), not worked around.

  The B0 deliverable is a table added to this document, one row per check:
  check, observed behaviour, evidence (request, log line or screenshot), and the
  decision for B1. The last row is the teardown of the spike instance and its
  OAuth app and secrets. Until that table exists, the B1 design below is
  preliminary.

  Where the spike instance runs and for how long is an implementer choice within
  existing infrastructure. It goes to the owner only if it adds cost or needs a
  new external resource.

#### B0 results (spike run 2026-10-15)

Setup: a throwaway ZITADEL v4.19.2 with Login V2 (the released `zitadel-login`
bundle), on a local Postgres 16, with no connection to production. Admin org
`ZITADEL`: a human admin with a password and TOTP, an IAM-owner service account
for API calls, and the login client. Org `customers` with the `mctl.ai` domain and
a GitHub Enterprise-type IdP that has auto-creation and auto-update on and linking
off. Two clients: a web client (PKCE) and a portal client (confidential, JWT
access tokens, `idTokenUserinfoAssertion`). The instance policy mirrors
production: `force_mfa=true`, no instance IdPs, and OTP and U2F as second factors.
The `customers` policy is the one in B1 below, with `allow_register=false`.

GitHub was a local mock that serves the OAuth and REST subset ZITADEL calls
(`/login/oauth/*`, `/api/v3/user`, `/api/v3/user/emails`) and has synthetic
personas. No GitHub OAuth app was created. The mock was a fair stand-in because
ZITADEL's github.com provider and its GitHub Enterprise provider run the same code
(`internal/idp/providers/github`): github.com only fixes the URLs. Real github.com
was **not** exercised, so the payloads match the mock's, not a live GitHub
response.

The candidate hook was one Actions v2 `restCall` service with three
signature-checked endpoints:
- a response execution on `UserService/RetrieveIdentityProviderIntent`;
- a request execution on `UserService/CreateUser` and `UserService/AddHumanUser`,
  and later also on the v1 `ManagementService` user-creation methods;
- the `preuserinfo` and `preaccesstoken` functions.

The browser steps ran in headless Chrome under Playwright. Evidence is the spike
hook log, the Login V2 log, the ZITADEL log, API responses and screenshots. All of
them were destroyed with the spike, and the excerpts below are quoted from them.

| Check | Observed behaviour | Evidence | Decision for B1 |
|---|---|---|---|
| Baseline, no hooks | Login V2 shows "complete registration" with the email prefilled from the **public** profile address. If `allow_register=false`, submitting fails with the raw key `register.errors.registerNotAllowed`. If `true`, an edited, unverified email is accepted and becomes the username. | Screenshot of the form; `MISSING_MESSAGE` in the login log; the created user had `username = email`, unverified. | Confirms section 4. The form path must be blocked (row 3). |
| 1. Creation without the form | **Pass.** With the intent response hook setting `createUser` (organization, username `<login>@mctl.ai`, name falling back to the login, family name `-`, verified email, IdP link, `github_id`/`github_login` metadata), Login V2 took the automatic `CreateUser` path with no form, even with `allow_register=false`. The user got username `alice-gh@mctl.ai`, the GitHub primary verified address marked verified, one IdP link `{userId: 1001, userName: alice-gh}`, and both metadata keys. A persona with no display name and one with a hidden public email were created the same way. | Hook log `intent: create` → `create: allow`; user listing; `ListIDPLinks`; metadata search. | `allow_register` stays `false`. The hook must set the organization itself: without it Login V2 resolves the org from the request scope, then domain discovery, then the **default (admin) org**. |
| 2. GitHub data in the hook | **Pass.** The intent response payload holds `idpInformation.oauth.accessToken`, `userId` (numeric id), `userName` (login) and `rawInformation` (the `/user` body). The hook called `/user/emails` with that token itself. The payload also carries the caller's `userID` (the login client's service user), `orgID`, `fullMethod` and request headers. | Hook log (token redacted); the mock logged `/api/v3/user/emails` from the hook. | The hook fetches the verified email itself, as planned. |
| 3. Every creation path is blocked | **Pass, with two additions.** No verified email → intent refused (412); public-only email → refused; reserved login → refused (403); no user created in any of these. Direct v2 `AddHumanUser` into `customers` → refused. v2 `CreateUser` into `customers` with no IdP link, or with a link but no matching metadata → refused. **But** v1 `ManagementService/ImportHumanUser` into `customers` **bypassed** the v2 gate and created a user. Adding request executions on the v1 `ImportHumanUser`, `AddHumanUser` and `AddMachineUser` closed that gap. **What the person sees:** a generic "Login failed: An error occurred while trying to login." The hook's message ("Verify an email address in GitHub, then sign in again.") appears only in the `error` query parameter, and the OIDC client gets no error callback. | Hook log `refuse-no-verified-email`, `refuse-reserved`, `refuse-form-path`, `refuse-unbound`, `refuse-v1`; API responses `code 7 … (EXEC-reUaUZCzCp)`; screenshot of the failure page. | Gate the creation request on all user-creating methods, v2 and v1, in `customers`, and treat the method list as something to re-check on every ZITADEL upgrade. SCIM was not checked. The create gate cannot prove that an IdP link comes from a real intent, so also require the caller to be the Login V2 service user (the `userID` in the payload). The refusal text has to reach the person some other way: a D1 text for the failure page, or the site explaining the rule before the redirect. |
| 4. Where fresh GitHub data comes from | **Pass for the numeric id; the login lags, as the doc expected.** The id is bound at creation in two places: the IdP link (`userId 1001`, never changes) and the `github_id` metadata written by the gated `CreateUser`. A rename with a successful update rewrote `github_login`. A rename with `UpdateUser` made to fail: sign-in still succeeded (Login V2 logs "Failed to auto-update user" and swallows it), and the ID token carried the same `sub` and `github_id` with the **stale** login. When the client sends the IdP hint, every interactive sign-in goes back through GitHub and re-runs the intent hook. A ZITADEL session reused without the hint made **no** GitHub call and issued claims from stored metadata. A refresh re-ran the token function and also read stored metadata. The username never changes on rename: Login V2 rebuilds the update from profile, email and phone only, so a `username` set by the hook is dropped. A **new** GitHub account that reuses a freed login hits "User already exists" and fails closed (`user_creation_failed`). | ID tokens from the `i4-*` runs; login log "Failed to auto-update user"; `ListIDPLinks` after both renames; login log `V3-DKcYh User already exists`. | Access is decided by `mctl:github_id` alone. The token function reads it from metadata, because the function payload has no IdP links. Users cannot write their own metadata. C0 or C2 may cross-check against `ListIDPLinks` when the principal is created. `mctl:github_login` is display only. A reused GitHub login needs a support runbook (rename or delete the old account); it is not a silent takeover. |
| 5. ID token, not only userinfo | **Claims: pass. "A failing hook prevents issuance": possible only in a form that breaks item 6.** The ID token for both the web client and the portal client carried `mctl:org`, `mctl:idp`, `mctl:github_id` and `mctl:github_login`, from `preuserinfo`, on a new sign-in, on a reused session and on a refresh. With `interruptOnError=true` on the token function, a failing hook does block issuance (`Errors.Execution.Failed`, or `Errors.Internal` when unreachable). But it **burns the refresh token**: a retry with the same token after the hook recovers gets `RefreshTokenInvalid`. It also blocks **admin** tokens, because functions are instance-wide. With `interruptOnError=false`, the tokens are issued **without** the `mctl:*` claims and the refresh chain survives. | Token responses from `refresh.sh`; the ZITADEL log `EXEC-dra6yamk98` and `OIDCS-28ubl`. | **Redesign of this point:** the token function is non-interrupting, and C0 fails closed when `mctl:github_id` is missing (no claim means no access, with a retry message), so ZITADEL does not have to refuse issuance. Also: `UpdateTarget` with `restCall.interruptOnError=false` was accepted but changed nothing (`changeDate` did not move, and `GetTarget` still showed `true`). Flipping the flag needs a new target, and the Terraform resource must be checked for the same behaviour. |
| 6. Failure blast radius (hook down) | **Both conditions hold with the B1 shape below.** Admin org: password + TOTP sign-in worked, the ID token was issued, the refresh worked, and an IAM-owner API read worked. Customers: the intent failed, no user was created, and a reused session still got tokens without claims. Creation: v2 `CreateUser` and `AddHumanUser` failed for **every** org, admin included, because request executions are instance-wide. v1 management creation in the admin org worked. With the token function interrupting, admin sign-in and refresh failed (`Errors.Internal`), so that variant fails item 6. With the hook down, the browser address bar showed the hook's internal URL in the failure `error` parameter. | Admin flow trail (`loginname → password → otp/time-based → callback`); API responses `connection refused`; refresh `500 Errors.Internal` (interrupting function only). | Accepted: the creation gate interrupts, and an outage blocks all v2 user creation, including zitadel-iac. Terraform provider 3.8.7 creates users through v2 (`userv2.CreateUser`), so a `terraform apply` that adds users fails until the hook is back. Existing admins and tokens are not affected. The hook must be on a public hostname, because the default `HTTPClient.DenyList` blocks private ranges and production does not override it. |
| MFA scope | `customers` users were asked for no ZITADEL second factor. The admin was asked for TOTP. | Flow trails. | Policy as in B1: org `force_mfa=false`, `force_mfa_local_only=true`. |
| Operational notes | Login V2 caches login settings for 15 minutes by default (`API_CACHE_CONFIG`), so policy changes reach the login late. Without the org scope, the login page offers no GitHub button, because the instance has no IdPs. | Login V2 source (`defaultCacheTTL`); `--noorg` run. | Clients send `urn:zitadel:iam:org:id:<customers>` and the IdP hint. Allow for the cache in rollout checks. |
| Not observed | Real github.com responses; a slow hook (timeout path); SCIM and other bulk or import APIs; v1 Actions coexistence on the same instance. | — | Covered by the B1 acceptance tests on production with test GitHub accounts; the user-creation method inventory is a B1 task. |
| Teardown | All spike processes stopped (ZITADEL, Login V2, proxy, mock GitHub, hook, Postgres). Data directory, binaries, logs, screenshots, PATs, keys and the master key deleted. No listening ports left. No GitHub OAuth app, Vault secret or cluster resource was created. | `lsof` shows no listener on the spike ports; the spike directory is gone. | — |

**B1 shape after B0** (signed off by the owner on 2026-10-15). Identity hook
on Actions v2, one signed `restCall` target per role:
1. **Response execution on `RetrieveIdentityProviderIntent`** with
   `interruptOnError=true`. It only runs on IdP sign-ins, and admins use none. It
   passes through anything that is not the `customers` GitHub IdP. Otherwise it
   fetches the primary verified email, refuses reserved logins, and replaces the
   user action with `createUser` (organization `customers` set explicitly) or
   `updateUser`.
2. **Request execution on every user-creating method**, v2 `CreateUser` and
   `AddHumanUser` and the v1 `ManagementService` create and import methods, with
   `interruptOnError=true`. It passes through other orgs. For `customers` it
   requires the Login V2 service user as the caller, exactly one GitHub IdP link,
   a matching `github_id`, a verified email and the `<login>@mctl.ai` username,
   and it refuses `AddHumanUser`.
3. **`preuserinfo` and `preaccesstoken` functions** with `interruptOnError=false`.
   They append `mctl:*` claims for listed clients only. C0 treats a missing
   `mctl:github_id` as a refusal.

The hook runs as a dedicated mctl-api endpoint behind a public hostname (DenyList),
checks the `ZITADEL-Signature` HMAC and its 300-second window, and has to be as
available as user creation needs to be. Actions v1 Complement Token is not used,
because v1 is removed in v5.

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
    user or is a service login. How it behaves when unreachable is decided by
    B0 item 6, not assumed.
  - A token-time function puts `mctl:org`, `mctl:idp`, `mctl:github_id` and
    `mctl:github_login` into the ID token only for listed client ids, and only
    `mctl:refused` when the id is missing or the login is reserved. Access is
    decided by the numeric id from the source B0 item 4 establishes. The login
    may lag behind a GitHub rename until the next successful update and is never
    used to grant access.
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
       `github_id` and creates no second user. `github_login` catches up on a
       successful update; a lagging login changes no access decision.
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
    9. With the hook unreachable, no customer account is created and admins
       keep signing in and getting tokens.
    10. No ID token, whether from a new login, a reused session or a refresh,
        carries a `mctl:github_id` other than the one bound to the account, or
        lacks a refusal the account should carry.
- **B1b.** Grant the `customers` org access to the portal and mctl-api projects.

#### Phase 0 results (local hook validation 2026-10-15)

The released mctl-api 4.89.0 identity hook was checked against a native local
ZITADEL v4.19.2 with Login V2. Production was not touched. The setup mirrors
gitops#1898 `customers.tf`: org `customers` with the `mctl.ai` domain, the GitHub
IdP, the restated login policy (`allow_register=false`), a listed web client and
a second, unlisted client, and the three signed targets. The executions were the
same as in #1898: a response execution on `RetrieveIdentityProviderIntent`, the
15 request executions from `docs/zitadel-identity-hook.md` (mctl-api), and the
`preuserinfo`/`preaccesstoken` functions. The two creation targets have
`interruptOnError=true` and the token target has `false`. The target signing keys
were fed into the mctl-api config.

The local instance copies production's credentials. Login V2 authenticates as
the System API user `login-client` with a JWT key. The automation runs as the
System API user `iac` (`IAM_OWNER` + `ORG_OWNER`), the shape
`zitadel-iac` uses. An org-level machine user with a PAT was checked as well.

The local run differs from production in four ways:
- the GitHub IdP is the GitHub Enterprise type pointed at a mock GitHub, which
  uses the same provider code as github.com;
- the hook's GitHub API base URL was overridden through a local-only patch that
  was never committed;
- `HTTPClient.DenyList` was emptied so the targets could be on loopback;
- the OIDC clients ran in dev mode on `http://localhost`.

| Check | Observed | Evidence | Decision |
|---|---|---|---|
| 1. Payload format | **Pass, no parser change.** The hook parsed every real payload with no `*_unparsable` reason. Request and response executions send `fullMethod`, `instanceID`, `userID`, `request`, `response` (intent only) and `headers`. `orgID` is present only when the caller belongs to an org: a System API user call (`iac`, `login-client`) has none. Proto bodies are camelCase protojson (`idpIntentId`, `organizationId`, `idpLinks`, `isVerified`), and metadata values are base64. The intent response carries `idpInformation.{idpId, userId, userName, oauth.accessToken, rawInformation}` plus Login V2's own prefilled `addHumanUser` and `createUser`, whose username is the bare GitHub login. Login V2 auto-creation then sent `CreateUser` exactly as the hook built it: organization, `<login>@mctl.ai`, profile, verified email, one IdP link, and `github_id`/`github_login` metadata. A repeat sign-in sent `UpdateUser` with profile, email and `metadata: [github_login]`. Function payloads are snake_case and shaped differently: `function` (`function/preuserinfo`, `function/preaccesstoken`), `userinfo`, `user` (`resource_owner`, `human.first_name`, ...), `user_metadata` (base64 values), `org{id,name,primary_domain}` and `application{client_id}`. They carry no IdP links. | A logging proxy in front of mctl-api captured every request; samples were kept redacted. Hook log reasons: `intent_create`, `intent_update`, `gate_customer_create`, `gate_metadata_login_client`, `token_claims`, `token_client_not_listed`, `token_other_org`. | Phase 2 uses mctl-api 4.89.0 as released. A reader of these payloads must not assume `orgID` is present. |
| 2. Login V2 caller id | **The gate sees the literal string `login-client`.** That is the System API user's name, not a numeric id: `userID: "login-client"` on `RetrieveIdentityProviderIntent`, `CreateUser` and `UpdateUser`. `iac` likewise appears as `userID: "iac"`. An org machine user appears by its numeric id. Mutation check: with `ZITADEL_HOOK_LOGIN_CLIENT_USER_ID` set to a numeric user id, a new sign-in was refused with `gate_caller_not_login_client:login-client` (`user_creation_failed`). Back on `login-client`, the same persona was created. | Captured payloads; hook log reasons from both runs. | `ZITADEL_HOOK_LOGIN_CLIENT_USER_ID=login-client`, the literal. It must equal the System API user name in the chart's `SystemAPIUsers`. Production has no user object to look up: a `ListUsers` username query finds nothing, because a System API user is not a ZITADEL user. Whoever renames the system user or moves Login V2 to a PAT machine user must change this value at the same time. |
| 3. Admin pass-through on the 15 gated methods | **Pass.** Calls against the admin org passed the hook, made both as `iac` and as an org machine user with a PAT: v2 `CreateUser`, v2 and v2beta `AddHumanUser`, v1 `AddHumanUser`, `ImportHumanUser` and `AddMachineUser`, v1 `SetUserMetadata` and `BulkSetUserMetadata` and v2 `SetUserMetadata` writing `github_login` as zitadel-iac does, and v2 `UpdateUser`. Admin `ImportData`, v3alpha `CreateUser`, and v2 and v2beta `AddIDPLink` with another IdP also passed the hook; ZITADEL then rejected the minimal test bodies on validation, and no successful import was attempted. `github_id` written on an admin-org user was refused (403), as designed. | 22 API calls with the hook decision per call; `gate_other_org`, `gate_github_id_immutable`. | Nothing blocks zitadel-iac. `github_id` must never be written by automation in any org. |
| 4. Customer sign-in and refusals | **Pass.** A new GitHub sign-in through the listed client created `<login>@mctl.ai` in `customers` with no form. The account got a verified email, one IdP link, and `github_id` and `github_login` metadata. The ID and access tokens both carried `mctl:org`, `mctl:idp`, `mctl:github_id` and `mctl:github_login`. The unlisted client got tokens with no `mctl:*` claim (`token_client_not_listed`). A persona with no display name was created with the login as its name. After a GitHub rename the user kept its subject, `github_id` and username, and `github_login` was updated. Refusals, with no user created in any of them: no verified email and public-only email (412, `intent_no_verified_email`); a login in `ADMIN_USERS` and a tenant name from gitops (403, `intent_login_reserved`); an Organization-type account (403, `intent_not_a_user`). Also refused (403): v2 `AddHumanUser` into customers as `login-client` (the form path), also by `orgDomain`; v1 `ImportHumanUser` into customers; admin `ImportData` into customers; v2 `CreateUser` into customers by `iac`, and by `login-client` with no IdP link; `AddIDPLink` with the customers IdP on a customer or an admin user; `github_id` written by `iac` or by `login-client` (`SetUserMetadata`, `UpdateUser`); and `github_login` written on a customer user through v1 with the customers org context. The person sees only Login V2's generic "Login failed" page; the hook's text is in the `error` query parameter, as in B0. | Playwright runs of Login V2; the customers user listing with metadata and links; API responses `EXEC-reUaUZCzCp`. | The behaviour matches B1 shape items 1 to 3. As `docs/zitadel-identity-hook.md` states, an instance admin can still rewrite a customer's `github_login` with v2 `SetUserMetadata`, or with v1 without the org context, because the request does not name customers. This was reproduced. `mctl:github_login` stays display-only; access is decided on `mctl:github_id`. |
| 5. Hook down | **Pass.** mctl-api was stopped and the target answered 502. The admin password sign-in completed and issued tokens, and the admin refresh token and a customer refresh token both refreshed (200), all without `mctl:*` claims. Gated methods failed closed: v2 `AddHumanUser` in the admin org returned `Execution failed (EXEC-dra6yamk98)`. A customer GitHub sign-in stopped on the failure page, with no user created. | Playwright and refresh runs; capture log `upstreamError`. | The non-interrupting token function is correct. Admin user management through the 15 methods depends on the hook being up; this is the documented trade-off. |
| 6. Phase 1 safety (IdP, policy, no executions) | **Only `is_creation_allowed=false` is safe.** With creation off, a GitHub sign-in ends on "Account Not Found" and no user is created. With creation on (auto-creation off, or on), Login V2 goes to its "Complete your data" form, because the GitHub mapping has no given or family name. On submit, Login V2 refuses with `registerNotAllowed` (`allow_register=false`), and no user was created. That refusal comes from a Login V2 form check plus a profile-mapping detail, not from ZITADEL's API: without the hook, nothing stops a creation request at the API. | Playwright runs on all three settings; user counts in customers after each. | Phase 1 uses `is_creation_allowed=false` and `is_auto_creation=false` (as the split gitops#1898 does). Both flip to `true` only in the same change that adds the executions. |
| Teardown | All processes stopped (ZITADEL, Login V2, proxy, mock GitHub, capture proxy, mctl-api, Postgres). Data directory, binaries, logs, screenshots, keys, PATs and the master key deleted. The mctl-api worktree was removed. No listening ports were left. No GitHub OAuth app, Vault secret or cluster resource was created. | `lsof` shows no listener on the ports used. | — |

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
- **C1a (Worker).** New `/api/zitadel/*` (login, callback, session, logout; the
  path registered on the mctl-web clients in B1, not `/api/auth/*`),
  `/api/team/check` and a cookie branch of `/api/submit`, alongside the unchanged
  legacy GitHub flow. mctl-web is a public PKCE client, so the Worker holds no
  client secret; state, nonce and the verifier ride in a short-lived `__Host-`
  cookie that only the site can set.
  - Server-side sessions in Workers KV behind an opaque `__Host-` cookie; the ID
    token never reaches the browser. Sessions last up to 8 hours.
  - Every cookie request re-presents the ID token to the portal and mctl-api, so a
    revoked identity or disabled principal is refused on the next request.
  - CSRF protection (Origin plus a custom header) on the cookie branch only.
  - A server-side test-group allowlist by GitHub numeric id until the public switch.
  - The KV namespaces (prod and dev) are OpenTofu resources in mctl-gitops
    (`infrastructure/cloudflare/account/workers-kv.tf`, mctl-gitops#1909).
- **C1b (site).** The new sign-in UI behind `?auth_flow=zitadel`, legacy by
  default. A later small flip makes it the default and updates /privacy, /docs and
  the welcome email.
  - `runtimeConfig.public.authFlow` (`NUXT_PUBLIC_AUTH_FLOW`, default `legacy`).
    The query parameter wins and is remembered in localStorage: the session
    cookie is browser-wide, and the Worker sends any cookie-bearing
    `/api/submit` down the session branch, so every tab has to show the flow
    the cookie belongs to. An explicit `?auth_flow=legacy` in a browser that
    remembered `zitadel` therefore ends the Worker session first; if the Worker
    does not confirm it, the page stays on the ZITADEL flow. A sign-out the
    Worker does not confirm (429, 503, network) is reported, not shown as
    signed out. The switch is UI only; the Worker's test group decides who may
    act.
  - The session is read from `GET /api/zitadel/session`; nothing about the
    identity is stored in the browser. Team checks and submits go to
    `/api/team/check` and the cookie branch of `/api/submit` with
    `credentials: 'include'` and `X-MCTL-Request: 1`.
  - Response handling is pure code in `app/lib/zitadelSession.ts` with node tests
    (`npm run test:site`), including the copy for every callback error code.
  - The Worker now keeps Workers Logs (`[observability]` in `wrangler.toml`):
    the first live sign-in on 2026-10-16 could only be reconstructed from zone
    analytics and the KV namespace.
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
- **D2. Two customer emails and a portal access page.** Today
  `renderWelcomeEmail` in `cloudflare-worker/index.js` goes out when the request
  is accepted, before the workspace exists, and lists no resources. Split it:
  - "Request accepted", sent by the Worker on submit: what was asked for, that
    provisioning has started, a contact link.
  - "Workspace ready": account `<login>@mctl.ai`, role, portal link, MCP
    endpoint, environments, and only the access that was actually granted. Text
    is built from the verified state, never from a fixed list.
  - Readiness is a separate check, not the create-tenant workflow's last step.
    That step only waits for the tenant app to be Synced/Healthy, which proves
    neither that the portal has synced the catalog nor that the person can sign
    in. Before sending, confirm: the tenant infrastructure; the membership as the
    portal and mctl-api see it for this principal; and each capability the email
    will list. A failed or partial check is unknown, never ready: no email is
    sent and the check retries.
  - Email delivery is decoupled from provisioning: a failed send never marks the
    workspace failed, and resending is idempotent (one "ready" email per tenant
    and principal, keyed so a retry cannot send a duplicate).
  - A portal page Workspace → Access reads the same source. The email is a
    snapshot of verified access at send time; the page shows the current state.
    After a revocation the old email stays as it was, so it says "as of <date>"
    and points to the Access page for the current list.

### Out of the first release

- **Stage E: access grants and revocation** for self-service members, after the
  public flip:
  - Argo CD: view own apps and logs, sync, restart (the existing per-tenant CSV).
  - Argo Workflows: view only; no creation from the UI. Drop `secrets: get` from
    the role a customer would get, or give customers a separate role without it.
  - kubectl: only on explicit grant, never namespace admin.
  - Grants are keyed by principal, not by login, and come from one source that
    the portal Access page also reads.
  - Removing a member, disabling the account or deleting the tenant revokes
    every grant. The stage defines a maximum revocation time per surface and
    proves it, because a refused new sign-in is not enough. For each kind of
    revocation the test holds sessions and credentials opened before it: an Argo
    CD session, an Argo Workflows session, a previously issued kubectl token,
    portal and MCP sessions. Each must lose access within the stated bound. The
    check is accepted only when proven both ways: access present after a grant,
    absent within the bound after each revocation.
  - The customer Workflows role is reviewed as a whole for any read of Secrets,
    not only the `secrets: get` in `sso-team-logs`.
- Forwarding `<login>@mctl.ai` as a real mailbox.
- Passkeys or other local sign-in for customer accounts.
- Moving existing login-keyed users to principal-keyed catalog entities.

## 6. Owner decisions for B1

Decided on 2026-10-15, after the B0 results:

- The B1 shape after B0, including its two changes to the earlier design: the
  token-time function does not interrupt on error and C0 refuses a token without
  `mctl:github_id`; and the creation gate covers the v1 `ManagementService`
  create and import methods as well as v2, with the Login V2 service user
  required as the caller.
- The v1 product decision in stage B: GitHub-only customer accounts, no
  additional ZITADEL MFA in the `customers` org, no local sign-in, passkeys or
  recovery method, recovery through GitHub.
- The `mctl.ai` domain for the `customers` org.
- The ordering condition: C0 is verified before B1b and before the mctl-api#377
  switch, and the switch moves if C0 is not ready.
- The identity hook runs as a dedicated mctl-api endpoint on a public hostname.

Still open, both inputs rather than decisions:

1. The owner creates the GitHub OAuth app for the ZITADEL IdP. The implementer
   stores its secret in Vault. B1 can be built and reviewed before that, but not
   applied.
2. The owner names the test group by GitHub login, including a new non-admin
   account. Needed before the B1 acceptance tests.

## 7. Done criterion

A new person goes from mctl.ai through sign-up to a workspace, then signs in to
the portal and connects an MCP client, with no manual Vault entry and no manual
membership fix.

## 8. Production acceptance record (2026-10-16)

- Web #147 (C1a) and #149 (C1b) merged; production is 7.8.0.
  Anonymous `GET /api/zitadel/session` returns `{"signedIn":false}`.
  The opt-in UI redirects through the customers ZITADEL client to the GitHub
  account chooser. The existing test account is `mctl-reviewer`.
- Portal #172/#173/#175 shipped in 4.21.0. Direct ArgoCD reads report the
  portal and mctl-api Synced/Healthy. The live Backstage database has
  `catalog_key`, `principal_id`, `login`, and the partial unique index
  `uq_tenant_members_principal` on user_id for principal-keyed membership.
  At this observation all ten membership rows were login-keyed; customer
  creation, catalog resolution and sign-in still need end-to-end proof.
- B1b needs both project grants and the identity-hook client allowlist extended
  to the portal UI/provider, API OAuth and CLI clients. Otherwise those clients
  can obtain tokens without the required customer claims and C0 refuses them.
  After IaC writes the Secret, mctl-api must roll out to load it.
- Keep `AUTH_FLOW_PUBLIC=false` and the site's legacy default until acceptance.
  A failed or incomplete check remains unknown; it does not satisfy the done
  criterion. Do not retire the legacy flow before the replacement is verified.

Remaining delivery: B1b and live C0/C2 checks; test-group sign-in, workspace,
portal and MCP; public cutover and C1c; customer Login V2/message texts (D1);
verified readiness plus idempotent ready notification and Access page (D2).
Stage E stays outside this first release as agreed above.

### Principal-mode launch dependency (updated 2026-10-17)

Production now runs `TENANT_AUTHZ_MODE=principal`. The owner explicitly approved
shortening the original seven-day shadow window in
[mctl-gitops#1873](https://github.com/mctlhq/mctl-gitops/pull/1873), merged as
b1798b838b6de3b04079d63e4a7fa645913dfb80. This is an early-cutover exception, not
proof that seven days elapsed. The original earliest date was 2026-10-19 21:33
UTC. Do not remove the customer sign-in guard or introduce a second cutover.

Fresh customer OAuth/MCP was verified at 15:42 UTC on API 4.92.0: the canonical
review principal is not an admin, can read only its workspace, and is refused
another tenant. The temporary test credentials were revoked. The acceptance
record below describes this customer's evidence; platform-wide identity
coverage must be assessed separately from mctl-api#377's live records.

Public signup and legacy retirement are separate decisions. Keep the legacy
rollback path for at least 14 days in principal mode (earliest 2026-10-31,
conditional on clean verification). D1 locale rollout and D2 ready-notification/
Access acceptance remain the immediate work. A ready notification lists only
capabilities verified at send time.

Live test-group recheck: `mctl-reviewer` completed GitHub → ZITADEL → website
sign-in and the form showed the successful availability state for
`onboarding-acceptance-test`, exercising C0 through the portal. Creating this
test workspace is awaiting the owner's action-time confirmation because it
creates an Owner grant. The earlier table's schema checks do not substitute
for the pending tenant/capability checks.

B1b implementation: mctl-gitops#1919. The legacy portal OIDC-provider client
is excluded from customer claims: unlike the portal UI it still resolves by
login and has no C0 customer-principal path. D1 English copy is tracked by the
customer-login-copy branch PR; full D1 acceptance and D2 remain open.

### B1b production apply

GitOps #1919 merged as `0ea5b4b2`. The live zitadel-iac Job created on
2026-10-16 20:26:44 UTC succeeded: two project grants added, one Secret updated,
zero resources destroyed. Both customers grants were created, and the live
`ZITADEL_HOOK_CLAIM_CLIENT_IDS` Secret contains five explicit client IDs.
GitOps #1921 rolled out mctl-api after this Secret update. The running process
was verified to load all five clients, with `TENANT_AUTHZ_MODE=shadow`, and the
application returned Synced/Healthy. Public website access remains disabled.

GitOps #1920 merged and the English D1 Login V2/verification-email copy applied
through the successful zitadel-iac Job created at 20:36:43 UTC. It does
not establish other locale coverage or prove that initial verified-email
creation sends no mail. D2 ready notifications and Workspace Access are not
implemented by these changes. The principal-mode gate above still blocks full
MCP and public-launch acceptance.

### C2 live sign-in configuration fix

A real portal sign-in as mctl-reviewer reached C0 but returned
`503 surface_identity_unavailable`. The generated hook Secret omitted
`ZITADEL_PORTAL_CLIENT_ID`, so the API deliberately left purpose=signin
unconfigured. GitOps #1923 wrote the portal UI client ID into the Secret; the successful
zitadel-iac Job created at 20:42:20 UTC applied it. #1924 then rolled out the API.
The running process was verified to have the same client ID as the portal's
`AUTH_OIDC_CLIENT_ID`, remain in shadow mode, and return Synced/Healthy.
The added test fails when that setting names the website client instead.
Real portal sign-in is rechecked below; successful configuration alone does
not establish tenant access.

Deferred non-blocking review follow-up: extend the upstream-locale drift
checker to cover the new org-scoped English Login V2 keys on ZITADEL upgrades.

Post-fix browser result: the same mctl-reviewer sign-in now reaches the expected
"This account is not a member of any MCTL tenant" refusal instead of 503.
This confirms customer resolution proceeds to the principal-keyed catalog
lookup; it does not grant access before membership exists. The test account
has no tenant yet, so creation, catalog convergence and the positive portal
access check still await the prepared workspace submission. Turnstile showed
"The verification could not be completed"; the form was left open for the
owner rather than bypassing verification or submitting an unconfirmed grant.

## Customer workspace acceptance (2026-10-17)

The owner submitted `onboarding-acceptance-test` as mctl-reviewer through the
cookie flow after renewing the GitHub/ZITADEL session. Workflow
`create-tenant-s56nf` started at 07:55:06 UTC and succeeded at 07:56:34 UTC.
The tenant Application is Synced/Healthy. Both main and preview namespaces
have quotas, limits, network policies and tenant SecretStores. The owner
membership is principal-keyed, and the portal settings show mctl-reviewer
with its principal User entity and the new workspace ownership. No manual
membership or identity database fix was used.

Opening the team Group then exposed a separate catalog-policy defect: the
entity exists with spec.owner, but Backstage does not emit ownedBy for
Group/User. Portal PR #176 adds a read-only declared-owner match against
canonical ownership refs, preserving foreign-tenant denial and existing
write restrictions. The Group page needs post-release verification.

The accepted-request form also retained the submitted draft after Got it.
This follow-up clears values and availability/verification state only after
confirmed success, then leaves a receipt instead of another submit form.
Failures retain the draft. The receipt reports acceptance, not readiness,
and is scoped to the current signed-in account. Browser fixture checks cover
a rejected request preserving values and a successful request clearing them,
closing the modal to a focused receipt with no visible submit action.

Operator notifications shared by the cookie and legacy flows now use mctl.ai
branding and app/ops/workflows.mctl.ai links; contact notifications use the
same brand. Worker tests assert the canonical URLs in both submit paths.
The legacy-domain redirect routes remain supported.

The principal-mode launch gate, full MCP acceptance and D2 work remain open.

### Production follow-up delivery

Web #154 and release #151 shipped 7.8.1. The live Rollout is Healthy and
production JavaScript contains the accepted-request receipt. A delayed-session
browser fixture (15 seconds) confirms that typing before the initial session
answer does not discard the draft. Acceptance then clears both fields and
Got it leaves the receipt; failure preserves the draft.

The same PR deployed Worker version `239961da-39df-4fa1-aef9-e36b1ff1043f`
through the successful Deploy CF Worker run 39016779304. New operator
notifications use the canonical mctl.ai URLs. Previously delivered Telegram
messages keep their original links. No extra production request was submitted
to test notification formatting; both Worker submit paths are covered by tests.

Portal #176 and release #177 shipped 4.21.1. Claude approved both current
implementation heads with no unaddressed P1/P2 findings; site generation,
145 Worker tests, 38 site tests, portal TypeScript compilation and 32 policy
tests passed. A P3 suggestion to expand the mutation-denial fixture from Group
to User is deferred; the same read-only condition is shared by both kinds.

Post-rollout browser verification: mctl-reviewer can now open
`/catalog/default/group/onboarding-acceptance-test`. The page shows the team,
its one principal-keyed member and one System; My Team is present in the sidebar.
The earlier Entity not found failure is resolved. Both web and portal are
Synced/Healthy; centralized release-deploy runs 39016932023 (web) and
39016763932 (portal) succeeded. The second informational review also passed
on the final web implementation head `d6eb595`.

This completes the test-group workspace/portal acceptance and the reported
form/notification corrections. It does not complete D2, other-locale/no-mail
D1 acceptance, the principal-mode gate, MCP end-to-end acceptance or public
cutover. The earliest principal cutover remains 2026-10-19 21:33 UTC subject
to all checks in mctl-api#377; do not treat that date as automatic approval.

## D1/D2 follow-up implementation (2026-10-17)

API #641 adds a portal-only, canonical-principal readiness observation. Portal
#178 checks that observation against the current membership and provider-shaped
catalog Group/User, serves Workspace → Access, and runs an independent durable
ready-email outbox. No failed/partial read means ready, no provisioning success
substitutes for catalog convergence, and MCP remains blocked outside its launch
gate. Production enablement and acceptance follow implementation reviews.

The outbox is one email per tenant/principal. It freezes the recipient, snapshot
and provider payload before attempting delivery; concurrent workers use a DB
lease and the same provider idempotency key. Resend retains keys for 24 hours,
so ambiguous retries stop at 23 hours in `reconcile` rather than risking a
second send. An accepted provider response means accepted, not delivered. No
email failure changes provisioning status. Current grants are rechecked before
retrying the old snapshot, and the email links to current Access.

D1 live first-creation evidence: the complete event listing for the review
account contains user.human.added, user.human.email.verified and
user.human.externalidp.added at 2026-10-15 22:46:12.143321 UTC, plus two metadata
writes. It contains no initial/email-code-added or sent event. The v4.19.2
notification handler subscribes to code-added events for these messages, not
human.added/email.verified. Together with the create hook's verified-primary-
email test, this establishes the no-mail first-create path for this account;
no mailbox content or credentials were copied into the plan. Source:
https://github.com/zitadel/zitadel/blob/v4.19.2/internal/notification/handlers/user_notifier.go.

Customer-specific English product copy is extended explicitly to all 15
supported login locales, preserving staff defaults. The existing locale drift
checker still covers the instance rebrand; extending its upstream-key check to
org-specific customer keys remains a non-blocking review follow-up.

Validation so far: the API suite and go vet pass with zero new lint findings;
three unchanged local gosec findings are not part of this feature. Portal
TypeScript/backend build and 1,096 tests pass (five existing skips). Mutations
that bypass ArgoCD convergence, catalog convergence or the durable accepted
marker make the corresponding tests fail. Customer Terraform tests pass 16/16;
dropping Russian fallback deliberately fails locale coverage. These are
implementation checks; they do not substitute for pending live delivery and
Access-page acceptance.

## Live customer MCP acceptance (2026-10-17)

The original seven-day shadow timing is superseded by the owner's explicit
early-cutover decision in mctl-gitops#1873, merged as b1798b838b6de3b04079d63e4a7fa645913dfb80.
It is an approved exception, not a completed seven-day observation. Both API
4.92.0 replicas are ready in principal mode. Legacy retirement still requires
the separate post-cutover observation period (earliest 2026-10-31, subject to
verification); public signup remains a separate decision.

At 15:42 UTC, a fresh native OAuth authorization-code/PKCE flow selected the
existing `mctl-reviewer` ZITADEL session. The MCP initialize handshake succeeded.
`mctl_whoami` returned canonical principal
`prn_01M39HRBR3C0QWSEHTYKG75F8C`, admin=false, and only
`onboarding-acceptance-test` membership/access. `mctl_get_tenant` read that
workspace with the principal-keyed owner entry and returned `access denied` for
`commerce-proof`. The temporary access and refresh tokens were revoked after
these read-only checks. No token or authorization code is retained here.
This closes this customer's GitHub → workspace → portal → MCP read/access
acceptance; it does not claim the full platform identity matrix or extended
Stage E grants/revocation are complete.

The new readiness API correctly returned 503 when its preview quota read was
forbidden. GitOps #1929 adds only a namespace-scoped get/list ResourceQuota
Role/RoleBinding in enabled preview namespaces. Production delivery and Access
remain pending this GitOps apply plus portal #178 deployment. The updated portal
suite passes 1,109 tests with five existing skips, plus TypeScript and backend
build; page tests prove failed polling removes old capability links.

## Final test-group production acceptance (2026-10-17)

This record supersedes the pending D1/D2 deployment statements above. Public
signup, extended Stage E grants/revocation, and legacy identity retirement
remain separate follow-ups.

- **D1:** GitOps #1929 applied the customer English fallback to all 15 supported
  login locales. Live database checks found 15 locales with identical customer
  login content and verification-message copy. GitOps #1938 serializes Terraform
  applies to avoid concurrent ZITADEL event-write collisions; its first job
  succeeded. The no-mail first-creation evidence is recorded above.
- **D2 Access:** API #641 and portal #178 are deployed. The signed-in reviewer
  opened /workspace/access and observed owner access, ready production and
  preview environments, and confirmed portal/MCP links. A forbidden preview
  quota read first produced 503; the namespace-scoped RBAC in GitOps #1929
  resolved it. Unknown reads therefore did not become ready grants.
- **D2 notification:** the durable outbox contains one accepted notification for
  onboarding-acceptance-test, accepted at 16:53:17 UTC with a provider ID.
  Subsequent observations retained that accepted row without another send.
  Provider acceptance is not proof of inbox delivery or reading.
  The historical test tenant's missing private contact was restored from its
  verified identity without publishing the address. Tenant synchronization now
  preserves private contact data instead of replacing it with absent public
  GitOps data.
- **Portal release:** 4.23.0 failed startup because a declared configuration
  schema was missing from the runtime package. GitOps #1939 restored 4.22.0;
  portal #182 added the missing package file and a production-image schema
  validation gate. Release 4.23.1 is running with zero restarts and healthy
  readiness. The image gate loaded schemas from all 12 workspace packages.
  Feature CI passed 1,161 tests with five existing skips.
- **Website:** #157 merged the customer request-accepted and ready-email copy.
  Release #156 published 7.9.0; the production rollout uses
  ghcr.io/mctlhq/mctl-web:7.9.0 and reports Healthy.
- **MCP:** the fresh customer PKCE handshake, own-workspace read, and denied
  foreign-workspace read are recorded in the preceding live acceptance section.

Production API, portal and website ArgoCD applications report Synced/Healthy.
No further operator action is required for this test-group acceptance.


## Post-acceptance roadmap (2026-10-17)

Planning baseline: test-group acceptance is complete; all items below are
planned, not implemented or authorized for production activation by this record.
Keep implementation PRs, rollout evidence, dates and gate results in this section.
The execution order is public signup, then Stage E. Legacy observation runs
alongside those stages; its retirement gate is independent. Optional hardening
can proceed independently and does not block launch unless it reveals a defect.

### P1. Public signup

Status: planned; next implementation stage. Repositories: mctl-web,
mctl-gitops, mctl-api and mctl-portal as required by the readiness checks.

- Inventory the effective production switches, customer creation policy,
  rate limits/Turnstile, capacity and operator alerts. Record current values,
  intended changes and a tested rollback before changing the public default.
- Repeat the full journey with a fresh customer identity and a new workspace:
  GitHub sign-in, verified identity, one accepted request, provisioning,
  principal-keyed membership, portal sign-in, Workspace Access and MCP.
  Cover duplicate submit, existing team, failed provisioning and retry;
  unknown readiness must not produce a ready notification or usable grants.
- Confirm a non-member and a different tenant remain denied. Confirm no
  unsolicited first-creation verification email and exactly one provider-
  accepted ready notification; record mailbox delivery separately if observed.
- Prepare the public-switch PR and its rollback, then record the owner launch
  decision before activation. Roll out in a controlled step and repeat the
  positive and negative production checks. Monitor auth/provisioning failures,
  queue backlog and notification retries; record the observation interval and
  rollback thresholds in the implementation PR before rollout.

Done when: public entry uses the accepted flow, a fresh public customer passes
end to end, isolation checks pass, production is healthy and rollback evidence
and the launch decision are linked here. Stage E is not a launch prerequisite.

### P2. Stage E: explicit grants and revocation

Status: planned after public signup. Repositories: mctl-api, mctl-portal and
mctl-gitops. Preserve the scope and session-based tests in "Out of the first
release" above.

- Define one principal-keyed grant model and an actor/role/surface permission
  matrix. Identify who may grant/revoke, audit every change and expose the
  effective grants on Workspace Access. Keep kubectl opt-in and least privilege.
- Implement Argo CD own-app/log viewing, sync and restart; Workflows viewing
  only, without UI creation or Secret reads. Review every customer role for
  equivalent Secret access, not just one named permission.
- Before rollout, define numerical maximum revocation times per surface and
  document cache, token/session lifetime and enforcement mechanisms. Do not
  claim revocation from a denied new login alone.
- Test member removal, account disable and tenant deletion against sessions
  and credentials issued beforehand: portal, MCP, Argo CD, Workflows and
  kubectl. Prove granted access first, then denial within each stated bound;
  include foreign-tenant and unauthorized grant attempts.

Done when: the matrix and time bounds are committed, all positive/negative
checks pass in production, Access reflects effective grants, audit evidence is
retained without credentials, and grant/revocation rollback is documented.

### P3. Retire legacy identity

Status: observing; earliest eligible date **2026-10-31**, not an automatic
execution date. Repositories: mctl-api, mctl-web, mctl-portal and mctl-gitops.
The approved early principal cutover in GitOps #1873 remains the baseline.

- Preserve at least 14 days of post-cutover observations and inspect auth
  errors, legacy fallback use, unresolved identity mappings and customer/staff
  access. Missing or partial telemetry means unknown and blocks retirement.
- Inventory remaining login-keyed identities and consumers, legacy GitHub
  OAuth/HMAC paths, configuration, credentials and rollback dependencies.
  Resolve or explicitly migrate every active dependency before removal.
- Recheck the customer/staff identity matrix, membership resolution, own and
  foreign tenant authorization across portal and MCP, and deployed API mode.
  Record evidence, observation dates and an explicit go/no-go decision here.
- Prepare removal in reviewable PRs with rollback steps and credential cleanup
  order. Remove obsolete paths/configuration only after the date and all gates
  pass; repeat production checks and observe after rollout.

Done when: the observation gate passes, no active consumer needs legacy identity,
removal PRs are deployed and post-removal checks are healthy. A failed gate
postpones retirement; the calendar alone cannot satisfy it.

### P4. Optional review follow-ups and locale drift coverage

Status: backlog; independent of public launch unless validation finds a defect.

- Portal: expand the catalog mutation-denial fixture from Group to User (P3
  from portal #176), preserving the shared read-only policy. Demonstrate that
  deliberately permitting a User mutation makes the test fail.
- GitOps/ZITADEL: extend the existing upstream-locale drift checker to
  organization-scoped customer Login V2 keys and verification-message keys for
  all 15 supported locales. Keep staff defaults separate and check the intended
  English fallback explicitly when upstream schemas or supported locales change.
- Prove the checker green on converged input and red on a removed/renamed key,
  a missing locale and altered customer copy. Failed reads, malformed data or
  incomplete pagination must report error/unknown, never a clean empty result.
- Revisit other historical audit nits only after checking current code and
  review threads; record a concrete remaining issue before scheduling work.

Done when: the scoped fixtures/checker are merged, deliberate mutations fail,
CI passes and an upgrade runbook explains how to review intentional drift.


### Public signup preparation started (2026-10-17)

Status: preparation in progress; public activation is not complete.
Production API 4.94.1 has two ready replicas and restricts NEW customer creation
to the three numeric GitHub IDs configured in GitOps. Existing customer sign-in
is independent of that creation restriction. The checked-in Worker production
flag is false and the generated website default is legacy; live Worker settings
and generated UI still require verification before activation.

The API, portal and website ArgoCD applications are Synced/Healthy. All four
cluster nodes are Ready; observed memory utilization is 67–73 percent and CPU
7–11 percent. The initial workflow query used the wrong namespace (argo) and
is not evidence of an empty backlog. The corrected argo-workflows query found
three running maintenance workflows (two shepherd and one token rotation); no
create-tenant workflow appeared in that running listing. Resource reservations
and provisioning capacity still need assessment before a public traffic increase.

The [Worker rollout runbook](../../cloudflare-worker/README.md#public-signup-rollout-and-rollback)
defines switch ownership, activation/rollback order, a 60-minute initial watch,
24-hour/seven-day follow-ups, monitoring sources and explicit pause thresholds.
Validation: all 148 Worker and 38 site tests pass. Public-submit checks cover
a customer outside the cohort, rollback against its existing session, and
preservation of authentication, CSRF and Turnstile requirements. An intentional
authorization bypass makes the new checks fail; the bypass was then removed.

Pending acceptance input: a fresh non-admin GitHub identity that has never
signed into MCTL. The existing mctl-reviewer cannot replace this first-creation
check. Continue inventory, tests and reviewable launch preparation while this
input is pending; keep public switches restricted until the live gate passes.

Capacity follow-up: worker-node memory requests are 53–60 percent of allocatable
memory and limits 106–128 percent; CPU requests are 33–44 percent. Current usage
is healthy, but overcommitted limits are not guaranteed capacity for new users.
Before activation, record the effective new-tenant quotas, a conservative initial
admission budget and the response when that budget is exhausted. This evidence
is still pending and must not be replaced with the node Ready condition.
