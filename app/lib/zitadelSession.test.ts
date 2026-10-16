import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SIGN_IN_ERROR_KEYS,
  interpretLogout,
  interpretSubmit,
  interpretTeamCheck,
  readSessionView,
  resolveAuthFlow,
  sessionFailure,
  sessionProfile,
  shouldEndSession,
} from './zitadelSession.ts'

const signedIn = {
  signedIn: true,
  login: 'octo',
  name: 'Octo Cat',
  email: 'octo@example.com',
  githubId: '583231',
  expiresAt: 1_800_000_000,
  canRequestWorkspace: true,
}

test('the query parameter wins over the remembered choice and the build default', () => {
  assert.equal(resolveAuthFlow('legacy', 'zitadel', 'legacy'), 'zitadel')
  assert.equal(resolveAuthFlow('zitadel', 'legacy', 'zitadel'), 'legacy')
})

test('without a query parameter the remembered choice applies', () => {
  assert.equal(resolveAuthFlow('legacy', null, 'zitadel'), 'zitadel')
})

test('the build default applies when nothing else is set', () => {
  assert.equal(resolveAuthFlow('zitadel', null, null), 'zitadel')
  assert.equal(resolveAuthFlow('legacy', null, null), 'legacy')
})

test('unknown values fall through to the next source, and finally to legacy', () => {
  assert.equal(resolveAuthFlow('legacy', 'ZITADEL', 'zitadel'), 'zitadel')
  assert.equal(resolveAuthFlow('legacy', 'github', null), 'legacy')
  assert.equal(resolveAuthFlow(undefined, undefined, 'other'), 'legacy')
  assert.equal(resolveAuthFlow('', '', ''), 'legacy')
})

test('only a switch to legacy from a remembered ZITADEL flow ends the session', () => {
  assert.equal(shouldEndSession('legacy', 'zitadel'), true)
  assert.equal(shouldEndSession('legacy', null), false)
  assert.equal(shouldEndSession('legacy', 'legacy'), false)
  assert.equal(shouldEndSession(null, 'zitadel'), false)
  assert.equal(shouldEndSession('zitadel', 'zitadel'), false)
  assert.equal(shouldEndSession('LEGACY', 'zitadel'), false)
})

test('logout: a 2xx ends the session and follows only an https end-session URL', () => {
  assert.deepEqual(interpretLogout(200, { signedIn: false, logoutUrl: 'https://auth.mctl.ai/oidc/v1/end_session?x=1' }), {
    ok: true, next: 'https://auth.mctl.ai/oidc/v1/end_session?x=1',
  })
  assert.deepEqual(interpretLogout(200, { logoutUrl: 'javascript:alert(1)' }), { ok: true, next: null })
  assert.deepEqual(interpretLogout(200, null), { ok: true, next: null })
})

test('logout: anything but a 2xx is not a sign-out', () => {
  assert.deepEqual(interpretLogout(429, { error: 'Too many requests. Please try again later.' }), {
    ok: false, key: 'js.session.rate_limited',
  })
  assert.deepEqual(interpretLogout(503, { error: 'Sign-in is not available' }), {
    ok: false, key: 'js.session.unavailable',
  })
  assert.deepEqual(interpretLogout(0, null), { ok: false, key: 'js.session.unavailable' })
  assert.equal(interpretLogout(302, { logoutUrl: 'https://x' }).ok, false)
})

test('a well-formed signed-in answer is read', () => {
  assert.deepEqual(readSessionView(signedIn), {
    login: 'octo',
    name: 'Octo Cat',
    email: 'octo@example.com',
    githubId: '583231',
    expiresAt: 1_800_000_000,
    canRequestWorkspace: true,
  })
})

test('a signed-out or malformed answer is not signed in', () => {
  assert.equal(readSessionView({ signedIn: false }), null)
  assert.equal(readSessionView(null), null)
  assert.equal(readSessionView('signedIn'), null)
  assert.equal(readSessionView({ ...signedIn, signedIn: 'true' }), null)
  assert.equal(readSessionView({ ...signedIn, login: '' }), null)
  assert.equal(readSessionView({ ...signedIn, login: 42 }), null)
})

test('a GitHub id that is not all digits is not signed in', () => {
  assert.equal(readSessionView({ ...signedIn, githubId: '' }), null)
  assert.equal(readSessionView({ ...signedIn, githubId: 583231 }), null)
  assert.equal(readSessionView({ ...signedIn, githubId: '583231/../x' }), null)
  assert.equal(readSessionView({ ...signedIn, githubId: '12a' }), null)
})

test('canRequestWorkspace must be literally true', () => {
  assert.equal(readSessionView({ ...signedIn, canRequestWorkspace: 'yes' })?.canRequestWorkspace, false)
  assert.equal(readSessionView({ ...signedIn, canRequestWorkspace: undefined })?.canRequestWorkspace, false)
})

test('optional fields default rather than reject', () => {
  const view = readSessionView({ signedIn: true, login: 'octo', githubId: '1' })
  assert.deepEqual(view, {
    login: 'octo', name: '', email: '', githubId: '1', expiresAt: 0, canRequestWorkspace: false,
  })
})

test('the profile badge takes the avatar from the id and the link from the login', () => {
  const view = readSessionView({ ...signedIn, login: 'a b' })!
  const profile = sessionProfile(view)
  assert.equal(profile.avatar_url, 'https://avatars.githubusercontent.com/u/583231?v=4')
  assert.equal(profile.html_url, 'https://github.com/a%20b')
  assert.equal(profile.name, 'Octo Cat')
})

test('every callback error code the Worker emits has a message', () => {
  const workerCodes = [
    'NOT_CONFIGURED', 'ACCESS_DENIED', 'MISSING_PARAMS', 'INVALID_STATE', 'TOKEN_EXCHANGE',
    'TOKEN_INVALID', 'EMAIL_UNVERIFIED', 'ACCOUNT_REFUSED', 'SESSION_STORE', 'RATE_LIMITED',
  ]
  for (const code of workerCodes) assert.ok(SIGN_IN_ERROR_KEYS[code], code)
  assert.equal(SIGN_IN_ERROR_KEYS.ACCOUNT_REFUSED, 'js.session.account_refused')
  assert.equal(SIGN_IN_ERROR_KEYS.RATE_LIMITED, 'js.session.rate_limited')
})

test('a 401 signs the visitor out, with its own message for a revoked session', () => {
  assert.deepEqual(sessionFailure(401, { code: 'session_revoked' }), {
    ok: false, key: 'js.session.revoked', signedOut: true,
  })
  assert.deepEqual(sessionFailure(401, { code: 'session_required' }), {
    ok: false, key: 'js.session.sign_in_required', signedOut: true,
  })
  assert.deepEqual(sessionFailure(401, null), {
    ok: false, key: 'js.session.sign_in_required', signedOut: true,
  })
})

test('403 answers keep the session', () => {
  assert.deepEqual(sessionFailure(403, { code: 'not_in_test_group' }), {
    ok: false, key: 'js.session.not_in_test_group', signedOut: false,
  })
  assert.deepEqual(sessionFailure(403, { code: 'csrf' }), {
    ok: false, key: 'js.submit.request_failed', signedOut: false,
  })
  assert.equal(sessionFailure(403, { code: 'other' }), null)
})

test('the Worker\'s not-configured 503 means the sign-in is unavailable', () => {
  assert.equal(sessionFailure(503, { error: 'Sign-in is not available' })?.key, 'js.session.unavailable')
  assert.equal(sessionFailure(502, { error: 'x' }), null)
  assert.equal(sessionFailure(200, {}), null)
})

test('a 503 that is not the sign-in one is not a session failure', () => {
  const portal = { success: false, message: 'Workspace requests are unavailable right now.' }
  assert.equal(sessionFailure(503, portal), null)
  assert.equal(sessionFailure(503, { success: false, error: 'upstream', message: 'down' }), null)
  assert.equal(sessionFailure(503, null), null)
  assert.equal(sessionFailure(503, {}), null)
})

test('submit: a portal outage keeps the Worker\'s message', () => {
  assert.deepEqual(
    interpretSubmit(503, { success: false, message: 'Workspace requests are unavailable right now.' }),
    { ok: false, message: 'Workspace requests are unavailable right now.', signedOut: false },
  )
  assert.equal((interpretSubmit(503, { error: 'Sign-in is not available' }) as { key?: string }).key,
    'js.session.unavailable')
})

test('submit: 429 has its own message', () => {
  assert.deepEqual(interpretSubmit(429, { error: 'Too many requests. Please try again later.' }), {
    ok: false, key: 'js.submit.rate_limited', signedOut: false,
  })
})

test('team check: an unreadable 503 is a failed check, not a sign-in outage', () => {
  assert.equal((interpretTeamCheck(503, null) as { key: string }).key, 'js.team.check_failed')
})

test('team check: available and taken names', () => {
  assert.deepEqual(interpretTeamCheck(200, { available: true }), { ok: true, available: true })
  assert.deepEqual(interpretTeamCheck(200, { available: false, reason: 'name_taken' }), {
    ok: true, available: false, key: 'js.team.taken',
  })
  assert.deepEqual(interpretTeamCheck(200, { available: false }), {
    ok: true, available: false, key: 'js.team.taken',
  })
})

test('team check: an account that already has a workspace gets its own message', () => {
  assert.deepEqual(interpretTeamCheck(200, { available: false, reason: 'creator_has_tenant' }), {
    ok: true, available: false, key: 'js.team.creator_has_tenant',
  })
})

test('team check: a 2xx without a boolean answer is a failed check, not "available"', () => {
  assert.equal(interpretTeamCheck(200, {}).ok, false)
  assert.equal(interpretTeamCheck(200, { available: 'true' }).ok, false)
  assert.equal(interpretTeamCheck(200, null).ok, false)
  assert.deepEqual(interpretTeamCheck(502, { available: true }), {
    ok: false, key: 'js.team.check_failed', signedOut: false,
  })
})

test('team check: format, rate limit and session failures', () => {
  assert.equal((interpretTeamCheck(400, {}) as { key: string }).key, 'js.team.wrong-format')
  assert.equal((interpretTeamCheck(429, {}) as { key: string }).key, 'js.team.rate_limited')
  assert.deepEqual(interpretTeamCheck(401, { code: 'session_revoked' }), {
    ok: false, key: 'js.session.revoked', signedOut: true,
  })
})

test('submit: success needs both a 2xx and success: true', () => {
  assert.deepEqual(interpretSubmit(200, { success: true, message: 'ok' }), { ok: true, message: 'ok' })
  assert.equal(interpretSubmit(200, { success: false, message: 'no' }).ok, false)
  assert.equal(interpretSubmit(200, {}).ok, false)
  assert.equal(interpretSubmit(500, { success: true }).ok, false)
})

test('submit: 409 maps the conflict code', () => {
  assert.deepEqual(interpretSubmit(409, { code: 'creator_has_tenant', message: 'x' }), {
    ok: false, key: 'js.team.creator_has_tenant', signedOut: false,
  })
  assert.deepEqual(interpretSubmit(409, { code: 'name_taken' }), {
    ok: false, key: 'js.team.taken', signedOut: false,
  })
})

test('submit: session failures come first, other failures keep the server message', () => {
  assert.equal(interpretSubmit(401, { code: 'session_revoked' }).ok, false)
  assert.deepEqual(interpretSubmit(401, {}), { ok: false, key: 'js.session.sign_in_required', signedOut: true })
  assert.deepEqual(interpretSubmit(502, { message: 'portal down' }), {
    ok: false, message: 'portal down', signedOut: false,
  })
})
