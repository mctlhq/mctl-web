// The ZITADEL sign-in on the site (stage C1b, docs/plans/site-onboarding-review.md).
//
// The Worker keeps the session (C1a): the browser holds only the HttpOnly
// `__Host-mctl_sid` cookie, so nothing here stores an identity. The site asks
// /api/zitadel/session who is signed in and sends its requests with the cookie
// and the X-MCTL-Request header the Worker's CSRF check requires.
//
// Pure functions only, so they run under `node --test` without Nuxt.

export type AuthFlow = 'legacy' | 'zitadel'

export const AUTH_FLOW_PARAM = 'auth_flow'

// The header the Worker's cookie routes require next to an allowed Origin.
// A custom header forces a CORS preflight, which a foreign origin cannot pass.
export const SESSION_REQUEST_HEADERS: Readonly<Record<string, string>> = { 'X-MCTL-Request': '1' }

function asFlow(value: unknown): AuthFlow | null {
  return value === 'legacy' || value === 'zitadel' ? value : null
}

// Which sign-in the site shows. `?auth_flow=` wins and is remembered in
// localStorage: the session cookie is browser-wide, so every tab has to agree
// with it (the Worker sends a cookie-bearing /api/submit down the session
// branch whatever the UI shows), and the Worker's logout and some error paths
// land on the bare site without the parameter. The build default comes last.
// The switch only changes the UI: the Worker decides who may act.
export function resolveAuthFlow(configured: unknown, query: unknown, remembered: unknown): AuthFlow {
  return asFlow(query) ?? asFlow(remembered) ?? asFlow(configured) ?? 'legacy'
}

export interface SessionView {
  login: string
  name: string
  email: string
  githubId: string
  expiresAt: number
  canRequestWorkspace: boolean
}

// Reads the body of GET /api/zitadel/session. Anything that is not a
// well-formed signed-in answer is "not signed in": the request routes check
// the session again on the server, so a wrong guess here costs only a button.
export function readSessionView(body: unknown): SessionView | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (b.signedIn !== true) return null
  if (typeof b.login !== 'string' || !b.login) return null
  if (typeof b.githubId !== 'string' || !/^\d+$/.test(b.githubId)) return null
  return {
    login: b.login,
    name: typeof b.name === 'string' ? b.name : '',
    email: typeof b.email === 'string' ? b.email : '',
    githubId: b.githubId,
    expiresAt: typeof b.expiresAt === 'number' ? b.expiresAt : 0,
    canRequestWorkspace: b.canRequestWorkspace === true,
  }
}

// The badge the existing GithubAuth component renders. The avatar comes from
// the numeric id, which survives a GitHub rename; the profile link from the
// login, which is display only.
export function sessionProfile(view: SessionView) {
  return {
    login: view.login,
    name: view.name,
    email: view.email,
    avatar_url: `https://avatars.githubusercontent.com/u/${view.githubId}?v=4`,
    html_url: `https://github.com/${encodeURIComponent(view.login)}`,
  }
}

// Error codes the Worker's /api/zitadel/callback puts in `#auth_error=`,
// mapped to i18n keys. The legacy keys are reused where the meaning is the
// same; an unknown code falls back to js.oauth.failed at the caller.
export const SIGN_IN_ERROR_KEYS: Readonly<Record<string, string>> = {
  ACCESS_DENIED: 'js.oauth.access_denied',
  INVALID_STATE: 'js.oauth.invalid_state',
  MISSING_PARAMS: 'js.oauth.missing_params',
  TOKEN_EXCHANGE: 'js.oauth.token_exchange',
  EMAIL_UNVERIFIED: 'js.oauth.email_unverified',
  NOT_CONFIGURED: 'js.session.unavailable',
  SESSION_STORE: 'js.session.unavailable',
  TOKEN_INVALID: 'js.session.token_invalid',
  ACCOUNT_REFUSED: 'js.session.account_refused',
  RATE_LIMITED: 'js.session.rate_limited',
}

// A request that failed because of the session: the caller re-reads the
// session (the Worker has already cleared the cookie) and shows `key`.
export interface SessionFailure {
  ok: false
  key: string
  signedOut: boolean
}

// 401, 403 and "sign-in not configured" answers from the cookie routes.
// Returns null for anything else, which the caller handles as its own route's
// failure.
export function sessionFailure(status: number, body: unknown): SessionFailure | null {
  const code = body && typeof body === 'object' ? (body as Record<string, unknown>).code : undefined
  if (status === 401) {
    return {
      ok: false,
      key: code === 'session_revoked' ? 'js.session.revoked' : 'js.session.sign_in_required',
      signedOut: true,
    }
  }
  if (status === 403 && code === 'not_in_test_group') {
    return { ok: false, key: 'js.session.not_in_test_group', signedOut: false }
  }
  if (status === 403 && code === 'csrf') {
    return { ok: false, key: 'js.submit.request_failed', signedOut: false }
  }
  // Two different 503s reach the site: the Worker's own "sign-in is not
  // configured" ({error}, no `success`), and on submit a portal outage
  // ({success: false, message}), which is not a sign-in problem and keeps its
  // message. An unreadable 503 body is not evidence of either.
  if (status === 503 && body && typeof body === 'object'
    && typeof (body as Record<string, unknown>).error === 'string'
    && !('success' in body)) {
    return { ok: false, key: 'js.session.unavailable', signedOut: false }
  }
  return null
}

export type TeamCheckResult =
  | { ok: true; available: true }
  | { ok: true; available: false; key: string }
  | SessionFailure
  | { ok: false; key: string; signedOut: false }

// POST /api/team/check, cookie branch. `taken` is the default for an
// unavailable name; the one reason with its own message is an account that
// already has a workspace, where another name would not help.
export function interpretTeamCheck(status: number, body: unknown): TeamCheckResult {
  const session = sessionFailure(status, body)
  if (session) return session
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  if (status === 400) return { ok: false, key: 'js.team.wrong-format', signedOut: false }
  if (status === 429) return { ok: false, key: 'js.team.rate_limited', signedOut: false }
  if (status < 200 || status >= 300 || typeof b.available !== 'boolean') {
    return { ok: false, key: 'js.team.check_failed', signedOut: false }
  }
  if (b.available) return { ok: true, available: true }
  return {
    ok: true,
    available: false,
    key: b.reason === 'creator_has_tenant' ? 'js.team.creator_has_tenant' : 'js.team.taken',
  }
}

// One failure shape, so a caller can read key/message/signedOut without
// narrowing first; SessionFailure fits it.
export type SubmitOutcome =
  | { ok: true; message?: string }
  | { ok: false; key?: string; message?: string; signedOut: boolean }

// POST /api/submit, cookie branch. Success needs both a 2xx and
// `success: true`, as for the legacy form (see app/composables/useApi.ts).
export function interpretSubmit(status: number, body: unknown): SubmitOutcome {
  const session = sessionFailure(status, body)
  if (session) return session
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  const message = b && typeof b.message === 'string' ? b.message : undefined
  if (status >= 200 && status < 300 && b?.success === true) return { ok: true, message }
  if (status === 429) return { ok: false, key: 'js.submit.rate_limited', signedOut: false }
  if (status === 409) {
    return {
      ok: false,
      key: b?.code === 'creator_has_tenant' ? 'js.team.creator_has_tenant' : 'js.team.taken',
      signedOut: false,
    }
  }
  return { ok: false, message, signedOut: false }
}
