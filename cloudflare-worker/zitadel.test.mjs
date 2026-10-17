// ZITADEL sign-in with server-side sessions (stage C1a): zitadel.js and the
// cookie-branch routes in index.js.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import worker, { signIdentity } from './index.js';
import {
  LOGIN_COOKIE,
  SESSION_COOKIE,
  pkceChallenge,
  resetJwksCache,
  sessionKey,
  verifyIdToken,
  zitadelConfig,
} from './zitadel.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ISSUER = 'https://auth.mctl.ai';
const CLIENT_ID = '395272531977766613';
const ORG_ID = '395272528420931285';
const IDP_ID = '395272531877168853';
const TEST_GITHUB_ID = '268260640';
const OTHER_GITHUB_ID = '583231';
const HMAC_KEY = 'test-hmac-key-for-zitadel-tests';

function b64url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

async function makeSigner(kid) {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return {
    jwk: { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', use: 'sig', kid },
    async sign(claims, header = {}) {
      const head = b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT', ...header }));
      const body = b64url(JSON.stringify(claims));
      const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(`${head}.${body}`));
      return `${head}.${body}.${b64url(new Uint8Array(sig))}`;
    },
  };
}

const signer = await makeSigner('key-1');
const stranger = await makeSigner('key-1');

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function claimsFor(nonce, overrides = {}) {
  const now = nowSeconds();
  return {
    iss: ISSUER,
    sub: '395285255046563541',
    aud: [CLIENT_ID, '395272531877234389'],
    azp: CLIENT_ID,
    exp: now + 12 * 3600,
    iat: now,
    nonce,
    email: 'reviewer@example.com',
    email_verified: true,
    name: 'MCTL Reviewer',
    'urn:zitadel:iam:user:resourceowner:id': ORG_ID,
    'mctl:org': 'customers',
    'mctl:idp': 'github',
    'mctl:github_id': TEST_GITHUB_ID,
    'mctl:github_login': 'mctl-reviewer',
    ...overrides,
  };
}

function createKv() {
  const store = new Map();
  return {
    store,
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiration && entry.expiration <= nowSeconds()) return null;
      return entry.value;
    },
    async put(key, value, options = {}) {
      store.set(key, { value, expiration: options.expiration });
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

function baseEnv(overrides = {}) {
  return {
    ZITADEL_ISSUER: ISSUER,
    ZITADEL_CLIENT_ID: CLIENT_ID,
    ZITADEL_ORG_ID: ORG_ID,
    ZITADEL_GITHUB_IDP_ID: IDP_ID,
    ZITADEL_REDIRECT_URI: 'https://mctl.ai/api/zitadel/callback',
    ZITADEL_POST_LOGOUT_URI: 'https://mctl.ai',
    SESSION_ORIGINS: 'https://mctl.ai',
    AUTH_FLOW_TEST_GITHUB_IDS: TEST_GITHUB_ID,
    SESSIONS: createKv(),
    BACKSTAGE_LANDING_TOKEN: 'test-landing-token',
    TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    TELEGRAM_CHAT_ID: 'test-chat-id',
    GITHUB_OAUTH_HMAC_KEY: HMAC_KEY,
    ...overrides,
  };
}

// Routes every outbound request by URL and records it.
function createNetwork({
  idToken = null,
  tokenStatus = 200,
  availability = { status: 200, body: { name: 'acme', available: true } },
  create = { status: 202, body: { workflowName: 'create-tenant-abc' } },
  turnstile = { success: true },
} = {}) {
  const calls = { jwks: 0, token: [], availability: [], create: [], legacyGet: 0, turnstile: 0, telegram: 0, resend: 0 };
  const json = (status, body) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
  const fetchStub = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url === `${ISSUER}/oauth/v2/keys`) {
      calls.jwks += 1;
      return json(200, { keys: [signer.jwk] });
    }
    if (url === `${ISSUER}/oauth/v2/token`) {
      calls.token.push(Object.fromEntries(new URLSearchParams(String(options.body))));
      return tokenStatus === 200 ? json(200, { id_token: idToken, access_token: 'at', token_type: 'Bearer' }) : json(tokenStatus, { error: 'invalid_grant' });
    }
    if (url === 'https://app.mctl.ai/api/tenant-management/tenants/availability') {
      calls.availability.push({ headers: options.headers, body: JSON.parse(options.body) });
      return json(availability.status, availability.body);
    }
    if (url === 'https://app.mctl.ai/api/tenant-management/tenants') {
      calls.create.push({ headers: options.headers, body: JSON.parse(options.body) });
      return json(create.status, create.body);
    }
    if (url.startsWith('https://app.mctl.ai/api/tenant-management/tenants/')) {
      calls.legacyGet += 1;
      return json(404, {});
    }
    if (url.startsWith('https://challenges.cloudflare.com/turnstile/')) {
      calls.turnstile += 1;
      return json(200, turnstile);
    }
    if (url.startsWith('https://api.telegram.org/')) {
      calls.telegram += 1;
      calls.telegramText = JSON.parse(options.body).text;
      return json(200, { ok: true });
    }
    if (url.startsWith('https://api.resend.com/')) {
      calls.resend += 1;
      return json(200, { id: 'email' });
    }
    throw new Error(`zitadel.test.mjs: unexpected fetch to ${url}`);
  };
  return { calls, fetchStub };
}

// The rate limiter keeps its counters in caches.default; a fresh cache per
// test keeps one test's requests from limiting the next.
function installCache() {
  const cache = new Map();
  globalThis.caches = {
    default: {
      async match(req) { return cache.has(req.url) ? new Response(cache.get(req.url)) : undefined; },
      async put(req, res) { cache.set(req.url, await res.clone().text()); },
      async delete(req) { return cache.delete(req.url); },
    },
  };
}

async function withNetwork(network, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = network.fetchStub;
  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function request(path, { method = 'GET', cookies = {}, headers = {}, body } = {}) {
  const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  return new Request(`https://mctl.ai${path}`, {
    method,
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const SITE = { Origin: 'https://mctl.ai', 'X-MCTL-Request': '1' };

function setCookies(res) {
  return res.headers.getSetCookie();
}

function cookieValue(res, name) {
  const line = setCookies(res).find(c => c.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).split(';')[0] : undefined;
}

// Starts a sign-in and returns the pending login cookie and its contents.
async function startLogin(env) {
  const res = await worker.fetch(request('/api/zitadel/login?redirect_to=https://mctl.ai'), env);
  const pendingCookie = cookieValue(res, LOGIN_COOKIE);
  const pending = JSON.parse(Buffer.from(pendingCookie, 'base64url').toString());
  return { res, pendingCookie, pending };
}

// A complete sign-in; returns the session cookie value.
async function signIn(env, claimOverrides = {}) {
  const { pendingCookie, pending } = await startLogin(env);
  const network = createNetwork({ idToken: await signer.sign(claimsFor(pending.n, claimOverrides)) });
  const res = await withNetwork(network, () => worker.fetch(
    request(`/api/zitadel/callback?code=c0de&state=${pending.s}`, { cookies: { [LOGIN_COOKIE]: pendingCookie } }), env));
  return { res, network, sessionId: cookieValue(res, SESSION_COOKIE) };
}

beforeEach(() => {
  resetJwksCache();
  installCache();
});

// ─── Sign-in start ───────────────────────────────────────────────────────────

test('login: redirects to the customers org with GitHub preselected and PKCE S256', async () => {
  const env = baseEnv();
  const { res, pending } = await startLogin(env);
  assert.equal(res.status, 302);
  const location = new URL(res.headers.get('Location'));
  assert.equal(`${location.origin}${location.pathname}`, `${ISSUER}/oauth/v2/authorize`);
  assert.equal(location.searchParams.get('client_id'), CLIENT_ID);
  assert.equal(location.searchParams.get('redirect_uri'), 'https://mctl.ai/api/zitadel/callback');
  assert.equal(location.searchParams.get('response_type'), 'code');
  const scopes = location.searchParams.get('scope').split(' ');
  for (const s of ['openid', 'email', 'urn:zitadel:iam:user:resourceowner',
    `urn:zitadel:iam:org:id:${ORG_ID}`, `urn:zitadel:iam:org:idp:id:${IDP_ID}`]) {
    assert.ok(scopes.includes(s), `scope ${s}`);
  }
  assert.equal(location.searchParams.get('state'), pending.s);
  assert.equal(location.searchParams.get('nonce'), pending.n);
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(location.searchParams.get('code_challenge'), await pkceChallenge(pending.v));
  assert.equal(pending.o, 'https://mctl.ai');
  const cookie = setCookies(res).find(c => c.startsWith(`${LOGIN_COOKIE}=`));
  assert.match(cookie, /; HttpOnly; Secure; SameSite=Lax; Path=\/; Max-Age=600$/);
  assert.doesNotMatch(cookie, /Domain=/i);
});

test('login: an unlisted redirect_to falls back to the site', async () => {
  const env = baseEnv();
  const res = await worker.fetch(request('/api/zitadel/login?redirect_to=https://evil.example'), env);
  const pending = JSON.parse(Buffer.from(cookieValue(res, LOGIN_COOKIE), 'base64url').toString());
  assert.equal(pending.o, 'https://mctl.ai');
});

test('login: a partial config sends nobody to ZITADEL', async () => {
  for (const missing of ['ZITADEL_CLIENT_ID', 'ZITADEL_ORG_ID', 'ZITADEL_GITHUB_IDP_ID', 'SESSIONS']) {
    const env = baseEnv({ [missing]: undefined });
    const res = await worker.fetch(request('/api/zitadel/login'), env);
    assert.equal(res.status, 302, missing);
    assert.equal(res.headers.get('Location'), 'https://mctl.ai/?auth_flow=zitadel#auth_error=NOT_CONFIGURED', missing);
    assert.equal(cookieValue(res, LOGIN_COOKIE), undefined, missing);
  }
});

// ─── Callback ────────────────────────────────────────────────────────────────

test('callback: stores the session server-side and sets only an opaque cookie', async () => {
  const env = baseEnv();
  const { res, network, sessionId } = await signIn(env);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://mctl.ai/?auth_flow=zitadel');
  assert.match(sessionId, /^[A-Za-z0-9_-]{43}$/);

  const cookie = setCookies(res).find(c => c.startsWith(`${SESSION_COOKIE}=`));
  assert.match(cookie, /; HttpOnly; Secure; SameSite=Lax; Path=\/; Max-Age=28800$/);
  assert.ok(setCookies(res).some(c => c.startsWith(`${LOGIN_COOKIE}=;`)), 'login cookie cleared');

  // The token exchange is a public PKCE client: verifier, no secret.
  assert.equal(network.calls.token.length, 1);
  assert.equal(network.calls.token[0].client_id, CLIENT_ID);
  assert.ok(network.calls.token[0].code_verifier);
  assert.equal(network.calls.token[0].client_secret, undefined);

  // Stored under the hash of the id, never the id itself.
  assert.equal(env.SESSIONS.store.size, 1);
  const [[key, entry]] = env.SESSIONS.store;
  assert.equal(key, await sessionKey(sessionId));
  assert.ok(!key.includes(sessionId));
  const record = JSON.parse(entry.value);
  assert.equal(record.github_id, TEST_GITHUB_ID);
  assert.equal(record.login, 'mctl-reviewer');
  assert.equal(record.email, 'reviewer@example.com');
  assert.equal(typeof record.id_token, 'string');
  assert.equal(entry.expiration, record.exp);
  assert.ok(Math.abs(record.exp - (nowSeconds() + 8 * 3600)) <= 2);
});

test('callback: the session never outlives the ID token', async () => {
  const env = baseEnv();
  const { res } = await signIn(env, { exp: nowSeconds() + 3600 });
  const cookie = setCookies(res).find(c => c.startsWith(`${SESSION_COOKIE}=`));
  const maxAge = Number(cookie.match(/Max-Age=(\d+)/)[1]);
  assert.ok(maxAge <= 3600 && maxAge >= 3598, `Max-Age ${maxAge}`);
  const [[, entry]] = env.SESSIONS.store;
  assert.ok(entry.expiration <= nowSeconds() + 3600);
});

test('callback: a state that does not match the cookie exchanges nothing', async () => {
  const env = baseEnv();
  const { pendingCookie } = await startLogin(env);
  const network = createNetwork();
  const res = await withNetwork(network, () => worker.fetch(
    request('/api/zitadel/callback?code=c0de&state=forged', { cookies: { [LOGIN_COOKIE]: pendingCookie } }), env));
  assert.equal(res.headers.get('Location'), 'https://mctl.ai/?auth_flow=zitadel#auth_error=INVALID_STATE');
  assert.equal(network.calls.token.length, 0);
  assert.equal(env.SESSIONS.store.size, 0);
});

test('callback: no login cookie, no session', async () => {
  const env = baseEnv();
  const network = createNetwork();
  const res = await withNetwork(network, () => worker.fetch(request('/api/zitadel/callback?code=c&state=s'), env));
  assert.equal(res.headers.get('Location'), 'https://mctl.ai/?auth_flow=zitadel#auth_error=INVALID_STATE');
  assert.equal(network.calls.token.length, 0);
});

test('callback: a refused token exchange creates no session', async () => {
  const env = baseEnv();
  const { pendingCookie, pending } = await startLogin(env);
  const network = createNetwork({ tokenStatus: 400 });
  const res = await withNetwork(network, () => worker.fetch(
    request(`/api/zitadel/callback?code=c&state=${pending.s}`, { cookies: { [LOGIN_COOKIE]: pendingCookie } }), env));
  assert.equal(res.headers.get('Location'), 'https://mctl.ai/?auth_flow=zitadel#auth_error=TOKEN_EXCHANGE');
  assert.equal(env.SESSIONS.store.size, 0);
});

// Each case changes one thing about an otherwise valid token.
const BAD_TOKENS = [
  ['signed by another key', async (n) => stranger.sign(claimsFor(n))],
  ['wrong issuer', async (n) => signer.sign(claimsFor(n, { iss: 'https://auth.example' }))],
  ['another client in aud', async (n) => signer.sign(claimsFor(n, { aud: ['portal-client'], azp: 'portal-client' }))],
  ['aud right, azp another client', async (n) => signer.sign(claimsFor(n, { azp: '395272531977701077' }))],
  ['the dev client', async (n) => signer.sign(claimsFor(n, { aud: ['395272531977701077'], azp: '395272531977701077' }))],
  ['expired', async (n) => signer.sign(claimsFor(n, { exp: nowSeconds() - 1 }))],
  ['too close to expiry', async (n) => signer.sign(claimsFor(n, { exp: nowSeconds() + 30 }))],
  ['issued in the future', async (n) => signer.sign(claimsFor(n, { iat: nowSeconds() + 600 }))],
  ['another nonce', async (n) => signer.sign(claimsFor(`${n}x`))],
  ['no nonce', async (n) => signer.sign(claimsFor(n, { nonce: undefined }))],
  ['another org (admins)', async (n) => signer.sign(claimsFor(n, { 'urn:zitadel:iam:user:resourceowner:id': '393549742312851157' }))],
  ['no org claim', async (n) => signer.sign(claimsFor(n, { 'urn:zitadel:iam:user:resourceowner:id': undefined }))],
  ['alg none', async (n) => {
    const t = await signer.sign(claimsFor(n));
    const [, body] = t.split('.');
    return `${b64url(JSON.stringify({ alg: 'none', kid: 'key-1' }))}.${body}.`;
  }],
  ['HS256 header', async (n) => signer.sign(claimsFor(n), { alg: 'HS256' })],
  ['unknown kid', async (n) => signer.sign(claimsFor(n), { kid: 'key-9' })],
  ['not a JWT', async () => 'garbage'],
];

for (const [label, makeToken] of BAD_TOKENS) {
  test(`callback: ID token refused (${label}), no session`, async () => {
    const env = baseEnv();
    const { pendingCookie, pending } = await startLogin(env);
    const network = createNetwork({ idToken: await makeToken(pending.n) });
    const res = await withNetwork(network, () => worker.fetch(
      request(`/api/zitadel/callback?code=c&state=${pending.s}`, { cookies: { [LOGIN_COOKIE]: pendingCookie } }), env));
    assert.equal(res.headers.get('Location'), 'https://mctl.ai/?auth_flow=zitadel#auth_error=TOKEN_INVALID');
    assert.equal(cookieValue(res, SESSION_COOKIE), undefined);
    assert.equal(env.SESSIONS.store.size, 0);
  });
}

const REFUSED_PEOPLE = [
  ['hook refused the account', { 'mctl:refused': 'login_reserved' }, 'ACCOUNT_REFUSED'],
  ['no GitHub id', { 'mctl:github_id': undefined }, 'ACCOUNT_REFUSED'],
  ['GitHub id not numeric', { 'mctl:github_id': '12a' }, 'ACCOUNT_REFUSED'],
  ['no GitHub login', { 'mctl:github_login': undefined }, 'ACCOUNT_REFUSED'],
  ['email not verified', { email_verified: false }, 'EMAIL_UNVERIFIED'],
  ['no email', { email: undefined }, 'EMAIL_UNVERIFIED'],
];

for (const [label, overrides, code] of REFUSED_PEOPLE) {
  test(`callback: ${label} -> ${code}, no session`, async () => {
    const env = baseEnv();
    const { res } = await signIn(env, overrides);
    assert.equal(res.headers.get('Location'), `https://mctl.ai/?auth_flow=zitadel#auth_error=${code}`);
    assert.equal(cookieValue(res, SESSION_COOKIE), undefined);
    assert.equal(env.SESSIONS.store.size, 0);
  });
}

// verifyIdToken on its own: the callback's minimum-lifetime rule would hide a
// missing expiry check, so each reason is asserted here directly.
test('verifyIdToken: names the reason for each refusal', async () => {
  const cfg = zitadelConfig(baseEnv());
  const now = nowSeconds();
  const cases = [
    ['expired', claimsFor('n', { exp: now })],
    ['expired', claimsFor('n', { exp: '9999999999' })],
    ['iat', claimsFor('n', { iat: now + 61 })],
    ['nonce', claimsFor('m')],
    ['org', claimsFor('n', { 'urn:zitadel:iam:user:resourceowner:id': '1' })],
    ['sub', claimsFor('n', { sub: '' })],
  ];
  await withNetwork(createNetwork(), async () => {
    const good = await verifyIdToken(await signer.sign(claimsFor('n')), cfg, { nonce: 'n', nowSeconds: now });
    assert.equal(good.ok, true);
    for (const [reason, claims] of cases) {
      const result = await verifyIdToken(await signer.sign(claims), cfg, { nonce: 'n', nowSeconds: now });
      assert.deepEqual(result, { ok: false, reason }, JSON.stringify(claims));
    }
  });
});

test('callback: a rotated signing key is fetched once, then cached', async () => {
  const env = baseEnv();
  const first = await signIn(env);
  assert.equal(first.network.calls.jwks, 1);
  const second = await signIn(env);
  assert.equal(second.network.calls.jwks, 0, 'cached key reused');
  assert.ok(second.sessionId);
});

// ─── Session and sign-out ────────────────────────────────────────────────────

test('session: no cookie -> signed out, nothing cleared', async () => {
  const env = baseEnv();
  const res = await worker.fetch(request('/api/zitadel/session'), env);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { signedIn: false });
  assert.equal(cookieValue(res, SESSION_COOKIE), undefined);
});

test('session: shows the person, never the ID token', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const res = await worker.fetch(request('/api/zitadel/session', {
    cookies: { [SESSION_COOKIE]: sessionId }, headers: { Origin: 'https://mctl.ai' } }), env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(res.headers.get('Access-Control-Allow-Credentials'), 'true');
  const text = await res.text();
  assert.doesNotMatch(text, /id_token|eyJ/);
  const body = JSON.parse(text);
  assert.equal(body.signedIn, true);
  assert.equal(body.login, 'mctl-reviewer');
  assert.equal(body.githubId, TEST_GITHUB_ID);
  assert.equal(body.canRequestWorkspace, true);
});

test('session: an unknown or malformed cookie is cleared', async () => {
  const env = baseEnv();
  for (const value of ['short', 'A'.repeat(43)]) {
    const res = await worker.fetch(request('/api/zitadel/session', { cookies: { [SESSION_COOKIE]: value } }), env);
    assert.deepEqual(await res.json(), { signedIn: false });
    assert.equal(cookieValue(res, SESSION_COOKIE), '');
  }
});

test('session: an expired record is signed out', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const key = await sessionKey(sessionId);
  const entry = env.SESSIONS.store.get(key);
  const record = JSON.parse(entry.value);
  // KV has not dropped it yet; the record's own exp still ends it.
  env.SESSIONS.store.set(key, { value: JSON.stringify({ ...record, exp: nowSeconds() - 1 }) });
  const res = await worker.fetch(request('/api/zitadel/session', { cookies: { [SESSION_COOKIE]: sessionId } }), env);
  assert.deepEqual(await res.json(), { signedIn: false });
  assert.equal(cookieValue(res, SESSION_COOKIE), '');
});

test('logout: needs the CSRF header, then deletes the session and returns the ZITADEL logout URL', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const cookies = { [SESSION_COOKIE]: sessionId };

  const refused = await worker.fetch(request('/api/zitadel/logout', {
    method: 'POST', cookies, headers: { Origin: 'https://mctl.ai' } }), env);
  assert.equal(refused.status, 403);
  assert.equal(env.SESSIONS.store.size, 1, 'session kept');

  const res = await worker.fetch(request('/api/zitadel/logout', { method: 'POST', cookies, headers: SITE }), env);
  assert.equal(res.status, 200);
  assert.equal(cookieValue(res, SESSION_COOKIE), '');
  assert.equal(env.SESSIONS.store.size, 0);
  const logoutUrl = new URL((await res.json()).logoutUrl);
  assert.equal(`${logoutUrl.origin}${logoutUrl.pathname}`, `${ISSUER}/oidc/v1/end_session`);
  assert.equal(logoutUrl.searchParams.get('client_id'), CLIENT_ID);
  assert.equal(logoutUrl.searchParams.get('post_logout_redirect_uri'), 'https://mctl.ai');
  assert.equal(logoutUrl.searchParams.get('id_token_hint'), null);

  const after = await worker.fetch(request('/api/zitadel/session', { cookies }), env);
  assert.deepEqual(await after.json(), { signedIn: false });
});

// ─── /api/team/check ─────────────────────────────────────────────────────────

test('team/check: CSRF — a foreign Origin or a missing header is refused before anything else', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const network = createNetwork();
  for (const headers of [
    { Origin: 'https://evil.example', 'X-MCTL-Request': '1' },
    { Origin: 'https://mctl.ai' },
    { 'X-MCTL-Request': '1' },
    { Origin: 'http://localhost:3000', 'X-MCTL-Request': '1' },
  ]) {
    const res = await withNetwork(network, () => worker.fetch(request('/api/team/check', {
      method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers, body: { name: 'acme' } }), env));
    assert.equal(res.status, 403, JSON.stringify(headers));
    assert.equal((await res.json()).code, 'csrf');
  }
  assert.equal(network.calls.availability.length, 0);
});

test('team/check: no session -> 401 session_required', async () => {
  const env = baseEnv();
  const network = createNetwork();
  const res = await withNetwork(network, () => worker.fetch(request('/api/team/check', {
    method: 'POST', headers: SITE, body: { name: 'acme' } }), env));
  assert.equal(res.status, 401);
  assert.equal((await res.json()).code, 'session_required');
  assert.equal(network.calls.availability.length, 0);
});

test('team/check: outside the test group -> 403, portal not asked', async () => {
  const env = baseEnv({ AUTH_FLOW_TEST_GITHUB_IDS: OTHER_GITHUB_ID });
  const { sessionId } = await signIn(env);
  const network = createNetwork();
  const res = await withNetwork(network, () => worker.fetch(request('/api/team/check', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE, body: { name: 'acme' } }), env));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'not_in_test_group');
  assert.equal(network.calls.availability.length, 0);
});

test('team/check: no test group configured -> nobody passes until the public switch', async () => {
  const env = baseEnv({ AUTH_FLOW_TEST_GITHUB_IDS: undefined });
  const { sessionId } = await signIn(env);
  const res = await withNetwork(createNetwork(), () => worker.fetch(request('/api/team/check', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE, body: { name: 'acme' } }), env));
  assert.equal(res.status, 403);
});

test('team/check: AUTH_FLOW_PUBLIC=true opens it to any signed-in customer', async () => {
  const env = baseEnv({ AUTH_FLOW_TEST_GITHUB_IDS: undefined, AUTH_FLOW_PUBLIC: 'true' });
  const { sessionId } = await signIn(env);
  const res = await withNetwork(createNetwork(), () => worker.fetch(request('/api/team/check', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE, body: { name: 'acme' } }), env));
  assert.equal(res.status, 200);
});

test('team/check: re-presents the stored ID token to the portal and relays the answer', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const record = JSON.parse([...env.SESSIONS.store.values()][0].value);
  const network = createNetwork({ availability: { status: 200, body: { name: 'acme', available: false, reason: 'creator_has_tenant' } } });
  const res = await withNetwork(network, () => worker.fetch(request('/api/team/check', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE, body: { name: 'acme' } }), env));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { available: false, reason: 'creator_has_tenant' });
  assert.equal(res.headers.get('Access-Control-Allow-Credentials'), 'true');
  assert.equal(network.calls.availability.length, 1);
  assert.deepEqual(network.calls.availability[0].body, { name: 'acme', creatorIdToken: record.id_token });
  assert.match(network.calls.availability[0].headers.Authorization, /^Bearer ey/);
});

test('team/check: the portal refusing the token ends the session', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const network = createNetwork({ availability: { status: 403, body: { error: 'refused', code: 'principal_disabled' } } });
  const res = await withNetwork(network, () => worker.fetch(request('/api/team/check', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE, body: { name: 'acme' } }), env));
  assert.equal(res.status, 401);
  assert.equal((await res.json()).code, 'session_revoked');
  assert.equal(cookieValue(res, SESSION_COOKIE), '');
  assert.equal(env.SESSIONS.store.size, 0);
});

test('team/check: a portal 403 that is not about the identity keeps the session', async () => {
  for (const body of [{ error: 'forbidden' }, { error: 'x', code: 'landing_token_invalid' }]) {
    const env = baseEnv();
    const { sessionId } = await signIn(env);
    const network = createNetwork({ availability: { status: 403, body } });
    const res = await withNetwork(network, () => worker.fetch(request('/api/team/check', {
      method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE, body: { name: 'acme' } }), env));
    assert.equal(res.status, 502, JSON.stringify(body));
    assert.equal(cookieValue(res, SESSION_COOKIE), undefined);
    assert.equal(env.SESSIONS.store.size, 1);
  }
});

test('team/check: a portal outage keeps the session', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const network = createNetwork({ availability: { status: 503, body: { error: 'unavailable' } } });
  const res = await withNetwork(network, () => worker.fetch(request('/api/team/check', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE, body: { name: 'acme' } }), env));
  assert.equal(res.status, 502);
  assert.equal(env.SESSIONS.store.size, 1);
});

// ─── /api/submit, cookie branch ──────────────────────────────────────────────

test('submit (session): creates the workspace for the signed-in customer only', async () => {
  const env = baseEnv({ RESEND_API_KEY: 'test-resend-key' });
  const { sessionId } = await signIn(env);
  const record = JSON.parse([...env.SESSIONS.store.values()][0].value);
  const network = createNetwork();
  const res = await withNetwork(network, () => worker.fetch(request('/api/submit', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE,
    // Body identity fields are ignored on this branch.
    body: { team: 'acme', usecase: 'demo', turnstile_token: 'ok', email: 'other@example.com', creatorUserId: 'mashkovd' },
  }), env));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(network.calls.create.length, 1);
  assert.deepEqual(network.calls.create[0].body, {
    tenantName: 'acme',
    displayName: 'acme',
    description: 'demo',
    contactEmail: 'reviewer@example.com',
    creatorIdToken: record.id_token,
  });
  assert.equal(network.calls.legacyGet, 0, 'no legacy existence probe');
  assert.equal(network.calls.telegram, 1);
  assert.ok(network.calls.telegramText.includes('mctl\\.ai'));
  assert.ok(network.calls.telegramText.includes('https://app\\.mctl\\.ai/'));
  assert.ok(network.calls.telegramText.includes('https://ops\\.mctl\\.ai/'));
  assert.ok(network.calls.telegramText.includes('https://workflows\\.mctl\\.ai/'));
  assert.ok(!network.calls.telegramText.includes('mctl\\.me'));
  assert.equal(network.calls.resend, 1);
});

test('submit (session): the portal 409 code reaches the site', async () => {
  for (const code of ['creator_has_tenant', 'name_taken']) {
    const env = baseEnv();
    const { sessionId } = await signIn(env);
    const network = createNetwork({ create: { status: 409, body: { error: 'x', code } } });
    const res = await withNetwork(network, () => worker.fetch(request('/api/submit', {
      method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE,
      body: { team: 'acme', turnstile_token: 'ok' } }), env));
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, code);
    assert.equal(network.calls.telegram, 0);
  }
});

test('submit (session): a refused token ends the session and creates nothing', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const network = createNetwork({ create: { status: 403, body: { error: 'refused', code: 'identity_refused' } } });
  const res = await withNetwork(network, () => worker.fetch(request('/api/submit', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE,
    body: { team: 'acme', turnstile_token: 'ok' } }), env));
  assert.equal(res.status, 401);
  assert.equal((await res.json()).code, 'session_revoked');
  assert.equal(env.SESSIONS.store.size, 0);
  assert.equal(network.calls.telegram, 0);
});

test('submit (session): a portal 403 that is not about the identity keeps the session', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const network = createNetwork({ create: { status: 403, body: { error: 'forbidden' } } });
  const res = await withNetwork(network, () => worker.fetch(request('/api/submit', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE,
    body: { team: 'acme', turnstile_token: 'ok' } }), env));
  assert.equal(res.status, 502);
  assert.equal(env.SESSIONS.store.size, 1);
  assert.equal(network.calls.telegram, 0);
});

test('submit (session): the success answer is not cacheable', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const res = await withNetwork(createNetwork(), () => worker.fetch(request('/api/submit', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE,
    body: { team: 'acme', turnstile_token: 'ok' } }), env));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(res.headers.get('Access-Control-Allow-Credentials'), 'true');
});

test('submit (session): Turnstile still gates it', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const network = createNetwork({ turnstile: { success: false, 'error-codes': ['invalid-input-response'] } });
  const res = await withNetwork(network, () => worker.fetch(request('/api/submit', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE,
    body: { team: 'acme', turnstile_token: 'bad' } }), env));
  assert.equal(res.status, 400);
  assert.equal(network.calls.create.length, 0);
});

test('submit (session): CSRF and the test group apply', async () => {
  const env = baseEnv({ AUTH_FLOW_TEST_GITHUB_IDS: OTHER_GITHUB_ID });
  const { sessionId } = await signIn(env);
  const network = createNetwork();
  const noHeader = await withNetwork(network, () => worker.fetch(request('/api/submit', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: { Origin: 'https://mctl.ai' },
    body: { team: 'acme', turnstile_token: 'ok' } }), env));
  assert.equal(noHeader.status, 403);
  const outside = await withNetwork(network, () => worker.fetch(request('/api/submit', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE,
    body: { team: 'acme', turnstile_token: 'ok' } }), env));
  assert.equal(outside.status, 403);
  assert.equal((await outside.json()).code, 'not_in_test_group');
  assert.equal(network.calls.create.length, 0);
  assert.equal(network.calls.turnstile, 0);
});

test('submit: an invalid session cookie is a 401, never a fall back to github_auth', async () => {
  const env = baseEnv();
  const github_auth = await signIdentity(
    { github_id: 583231, login: 'octocat', email: 'octocat@example.com', name: 'Octo' }, HMAC_KEY, nowSeconds());
  const network = createNetwork();
  const res = await withNetwork(network, () => worker.fetch(request('/api/submit', {
    method: 'POST', cookies: { [SESSION_COOKIE]: 'A'.repeat(43) }, headers: SITE,
    body: { github_auth, team: 'acme', turnstile_token: 'ok' } }), env));
  assert.equal(res.status, 401);
  assert.equal((await res.json()).code, 'session_required');
  assert.equal(network.calls.create.length, 0);
});

// ─── Legacy contract ─────────────────────────────────────────────────────────

test('legacy: /api/submit without a cookie and without the new headers works as before', async () => {
  const env = baseEnv();
  const github_auth = await signIdentity(
    { github_id: 583231, login: 'octocat', email: 'octocat@example.com', name: 'Octo' }, HMAC_KEY, nowSeconds());
  const network = createNetwork();
  const res = await withNetwork(network, () => worker.fetch(request('/api/submit', {
    method: 'POST', headers: { Origin: 'https://mctl.ai' },
    body: { github_auth, team: 'acme', turnstile_token: 'ok' } }), env));
  assert.equal(res.status, 200);
  assert.equal(network.calls.legacyGet, 1);
  assert.equal(network.calls.create.length, 1);
  assert.equal(network.calls.create[0].body.creatorUserId, 'octocat');
  assert.equal(network.calls.create[0].body.creatorIdToken, undefined);
});

test('legacy: /api/github/login still goes to GitHub', async () => {
  const env = baseEnv({ GITHUB_CLIENT_ID: 'gh-client' });
  const res = await worker.fetch(request('/api/github/login'), env);
  assert.equal(res.status, 302);
  assert.match(res.headers.get('Location'), /^https:\/\/github\.com\/login\/oauth\/authorize\?/);
});

// ─── CORS ────────────────────────────────────────────────────────────────────

test('preflight: the site may send the session cookie and the CSRF header; localhost may not in production', async () => {
  const env = baseEnv();
  const site = await worker.fetch(request('/api/team/check', {
    method: 'OPTIONS', headers: { Origin: 'https://mctl.ai' } }), env);
  assert.equal(site.headers.get('Access-Control-Allow-Credentials'), 'true');
  assert.match(site.headers.get('Access-Control-Allow-Headers'), /X-MCTL-Request/);

  const local = await worker.fetch(request('/api/team/check', {
    method: 'OPTIONS', headers: { Origin: 'http://localhost:3000' } }), env);
  assert.equal(local.headers.get('Access-Control-Allow-Credentials'), null);
});

test('preflight: credentials are advertised only on the session-cookie routes', async () => {
  const env = baseEnv();
  for (const path of ['/api/contact', '/api/github/check-team', '/api/zitadel/login']) {
    const res = await worker.fetch(request(path, { method: 'OPTIONS', headers: { Origin: 'https://mctl.ai' } }), env);
    assert.equal(res.headers.get('Access-Control-Allow-Credentials'), null, path);
  }
});

test('CORS: a session origin outside the legacy list still gets a matching Allow-Origin', async () => {
  const env = baseEnv({ SESSION_ORIGINS: 'https://mctl.ai,https://staging.mctl.ai' });
  const res = await worker.fetch(request('/api/zitadel/session', {
    method: 'OPTIONS', headers: { Origin: 'https://staging.mctl.ai' } }), env);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://staging.mctl.ai');
  assert.equal(res.headers.get('Access-Control-Allow-Credentials'), 'true');
});

test('session: rate limited', async () => {
  const env = baseEnv();
  let last;
  for (let i = 0; i < 61; i++) {
    last = await worker.fetch(request('/api/zitadel/session', { headers: { 'CF-Connecting-IP': '203.0.113.9' } }), env);
  }
  assert.equal(last.status, 429);
});

test('callback: rate limited -> back to the site, pending login cleared', async () => {
  const env = baseEnv();
  const network = createNetwork();
  let last;
  for (let i = 0; i < 31; i++) {
    last = await withNetwork(network, () => worker.fetch(request('/api/zitadel/callback?code=c&state=s', {
      headers: { 'CF-Connecting-IP': '203.0.113.7' }, cookies: { [LOGIN_COOKIE]: 'x' } }), env));
  }
  assert.equal(last.status, 302);
  assert.equal(last.headers.get('Location'), 'https://mctl.ai/?auth_flow=zitadel#auth_error=RATE_LIMITED');
  assert.ok(setCookies(last).some(c => c.startsWith(`${LOGIN_COOKIE}=;`)));
});

test('submit (session): the Telegram status line is escaped once', async () => {
  const env = baseEnv();
  const { sessionId } = await signIn(env);
  const network = createNetwork();
  await withNetwork(network, () => worker.fetch(request('/api/submit', {
    method: 'POST', cookies: { [SESSION_COOKIE]: sessionId }, headers: SITE,
    body: { team: 'acme', turnstile_token: 'ok' } }), env));
  assert.match(network.calls.telegramText, /• ✅ Workflow submitted: `create\\-tenant\\-abc`/);
});
