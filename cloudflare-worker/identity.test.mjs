// mctl-web#133: the identity the Worker hands the browser is signed as a
// whole (v2), expires, and carries only a verified email.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as workerModule from './index.js';
import worker, {
  encodeIdentity,
  handleCheckTeam,
  handleFormSubmit,
  hmacSign,
  signIdentity,
  verifyIdentity,
} from './index.js';

const KEY = 'test-hmac-key-for-identity-tests';
const IDENTITY_TTL_SECONDS = 8 * 60 * 60;

// workerd treats every named export of the main module as an entrypoint and
// fails to start ("Incorrect type for map entry") on anything that is not a
// function or handler object. Node imports such a module happily, so only
// this check catches it before deploy.
test('every named export of the Worker module is a function', () => {
  for (const [name, value] of Object.entries(workerModule)) {
    if (name === 'default') continue;
    assert.equal(typeof value, 'function', `export ${name}`);
  }
});
const NOW = 1_800_000_000;
const FIELDS = { github_id: 583231, login: 'octocat', email: 'octo@example.com', name: 'Octo Cat' };

const sign = (fields = FIELDS, now = NOW) => signIdentity(fields, KEY, now);

// ── verifyIdentity ──────────────────────────────────────────────────────────

test('a fresh v2 identity verifies and yields only the signed fields', async () => {
  const identity = await sign();
  const res = await verifyIdentity(identity, KEY, NOW);
  assert.equal(res.ok, true);
  assert.deepEqual(res.identity, { ...FIELDS, exp: NOW + IDENTITY_TTL_SECONDS });
});

test('changing any signed field breaks the signature', async () => {
  const identity = await sign();
  const tampered = {
    github_id: 1,
    login: 'someone-else',
    email: 'victim@example.org',
    name: 'Mallory',
    exp: identity.exp + 3600,
  };
  for (const [field, value] of Object.entries(tampered)) {
    const res = await verifyIdentity({ ...identity, [field]: value }, KEY, NOW);
    assert.deepEqual(res, { ok: false, reason: 'auth_invalid' }, field);
  }
});

test('the unsigned display fields cannot change what the Worker trusts', async () => {
  const identity = await sign();
  const res = await verifyIdentity(
    { ...identity, avatar_url: 'https://evil.example/x.png', html_url: 'https://evil.example' }, KEY, NOW);
  assert.equal(res.ok, true);
  assert.equal('html_url' in res.identity, false);
});

test('a v2 identity past exp is auth_expired, one second before is fine', async () => {
  const identity = await sign();
  assert.equal((await verifyIdentity(identity, KEY, identity.exp - 1)).ok, true);
  assert.deepEqual(await verifyIdentity(identity, KEY, identity.exp), { ok: false, reason: 'auth_expired' });
});

test('an expired identity with a forged exp is auth_invalid, not accepted', async () => {
  const identity = await sign();
  const res = await verifyIdentity({ ...identity, exp: identity.exp + 10 * 3600 }, KEY, identity.exp + 3600);
  assert.deepEqual(res, { ok: false, reason: 'auth_invalid' });
});

test('every v1 blob is auth_format, even with a valid v1 signature', async () => {
  const v1 = {
    login: 'octocat', name: 'Octo', email: 'octo@example.com',
    avatar_url: '', html_url: 'https://github.com/octocat',
    sig: await hmacSign('octocat', KEY),
  };
  assert.deepEqual(await verifyIdentity(v1, KEY, NOW), { ok: false, reason: 'auth_format' });
});

test('malformed v2 fields are auth_format', async () => {
  const identity = await sign();
  const bad = [
    { v: 3 }, { v: '2' }, { github_id: '583231' }, { github_id: 0 }, { github_id: 1.5 },
    { login: 'bad login' }, { login: '-lead' }, { email: '' }, { email: 'no-at-sign' },
    { name: null }, { exp: '9999999999' }, { exp: 1.5 },
  ];
  for (const patch of bad) {
    const res = await verifyIdentity({ ...identity, ...patch }, KEY, NOW);
    assert.deepEqual(res, { ok: false, reason: 'auth_format' }, JSON.stringify(patch));
  }
});

test('no github_auth, or one without login/sig, is missing', async () => {
  for (const raw of [undefined, null, 'x', [], {}, { login: 'a' }, { sig: 'b' }]) {
    assert.deepEqual(await verifyIdentity(raw, KEY, NOW), { ok: false, reason: 'missing' }, JSON.stringify(raw));
  }
});

test('a non-ASCII name round-trips through the fragment encoding and verifies', async () => {
  const identity = await sign({ ...FIELDS, name: 'Дмитрий 山田' });
  const encoded = encodeIdentity(identity);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
  assert.deepEqual(decoded, identity);
  assert.equal((await verifyIdentity(decoded, KEY, NOW)).ok, true);
});

// ── Handlers ────────────────────────────────────────────────────────────────

function env() {
  return {
    GITHUB_OAUTH_HMAC_KEY: KEY,
    TURNSTILE_SECRET_KEY: 'ts',
    BACKSTAGE_LANDING_TOKEN: 'landing',
    RESEND_API_KEY: 're_test',
    TELEGRAM_BOT_TOKEN: 'tg',
    TELEGRAM_CHAT_ID: '1',
  };
}

function stubFetch() {
  const calls = { resend: [], telegram: [], backstagePost: [], backstageGet: 0 };
  const fetchStub = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const host = new URL(url).hostname;
    if (host === 'challenges.cloudflare.com') return Response.json({ success: true });
    if (host === 'api.resend.com') { calls.resend.push(JSON.parse(init.body)); return Response.json({ id: 'x' }); }
    if (host === 'api.telegram.org') { calls.telegram.push(JSON.parse(init.body)); return Response.json({ ok: true }); }
    if (url.endsWith('/api/tenant-management/tenants') && init.method === 'POST') {
      calls.backstagePost.push(JSON.parse(init.body));
      return Response.json({ workflowName: 'create-tenant-x' }, { status: 202 });
    }
    if (url.includes('/api/tenant-management/tenants/')) { calls.backstageGet++; return new Response('', { status: 404 }); }
    throw new Error(`unexpected fetch ${url}`);
  };
  return { fetchStub, calls };
}

async function withFetch(fetchStub, fn) {
  const original = globalThis.fetch;
  const originalError = console.error;
  globalThis.fetch = fetchStub;
  console.error = () => {};
  try { return await fn(); } finally { globalThis.fetch = original; console.error = originalError; }
}

const post = (path, body) => new Request(`https://mctl.ai${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' },
  body: JSON.stringify(body),
});

const nowIdentity = (fields = FIELDS) => signIdentity(fields, KEY, Math.floor(Date.now() / 1000));

test('submit: body email/name that differ from the signed ones are refused', async () => {
  const identity = await nowIdentity();
  for (const patch of [{ email: 'victim@example.org' }, { name: 'Free money, click here' }]) {
    const { fetchStub, calls } = stubFetch();
    const res = await withFetch(fetchStub, () => handleFormSubmit(
      post('/api/submit', { github_auth: { ...identity, ...patch }, team: 'my-team', usecase: 'u', turnstile_token: 't' }),
      env(), 'https://mctl.ai'));
    assert.equal(res.status, 403, JSON.stringify(patch));
    assert.equal(calls.resend.length, 0);
    assert.equal(calls.backstagePost.length, 0);
  }
});

test('submit: mail, contactEmail and Telegram use only the signed identity', async () => {
  const identity = await nowIdentity();
  const { fetchStub, calls } = stubFetch();
  const res = await withFetch(fetchStub, () => handleFormSubmit(
    post('/api/submit', {
      // A changed unsigned display field is ignored, not trusted.
      github_auth: { ...identity, html_url: 'https://evil.example/profile' },
      team: 'my-team', usecase: 'u', turnstile_token: 't',
    }),
    env(), 'https://mctl.ai'));
  assert.equal(res.status, 200);
  assert.deepEqual(calls.resend[0].to, ['octo@example.com']);
  assert.equal(calls.backstagePost[0].contactEmail, 'octo@example.com');
  assert.equal(calls.backstagePost[0].creatorUserId, 'octocat');
  const tg = calls.telegram[0].text;
  assert.ok(tg.includes('mctl\\.ai'));
  assert.ok(tg.includes('https://app\\.mctl\\.ai/'));
  assert.ok(tg.includes('https://ops\\.mctl\\.ai/'));
  assert.ok(tg.includes('https://workflows\\.mctl\\.ai/'));
  assert.ok(!tg.includes('mctl\\.me'));
  assert.match(tg, /github\\\.com\/octocat/);
  assert.doesNotMatch(tg, /evil\.example/);
});

test('submit: v1 and expired identities get 401 with their code, before Turnstile', async () => {
  const v1 = { login: 'octocat', name: 'Octo', email: 'octo@example.com', sig: await hmacSign('octocat', KEY) };
  const expired = await signIdentity(FIELDS, KEY, Math.floor(Date.now() / 1000) - IDENTITY_TTL_SECONDS - 1);
  for (const [github_auth, code] of [[v1, 'auth_format'], [expired, 'auth_expired']]) {
    const { fetchStub, calls } = stubFetch();
    const res = await withFetch(fetchStub, () => handleFormSubmit(
      post('/api/submit', { github_auth, team: 'my-team', usecase: 'u', turnstile_token: 't' }),
      env(), 'https://mctl.ai'));
    assert.equal(res.status, 401, code);
    assert.equal((await res.json()).code, code);
    assert.equal(calls.resend.length + calls.backstagePost.length + calls.backstageGet, 0);
  }
});

test('check-team: v1 and expired identities get 401 with their code, same body for every name', async () => {
  const v1 = { login: 'octocat', sig: await hmacSign('octocat', KEY) };
  const expired = await signIdentity(FIELDS, KEY, Math.floor(Date.now() / 1000) - IDENTITY_TTL_SECONDS - 1);
  for (const [github_auth, code] of [[v1, 'auth_format'], [expired, 'auth_expired']]) {
    const bodies = [];
    for (const name of ['taken-team', 'free-team']) {
      const { fetchStub, calls } = stubFetch();
      const res = await withFetch(fetchStub, () => handleCheckTeam(
        post('/api/github/check-team', { name, github_auth }), env(), 'https://mctl.ai'));
      assert.equal(res.status, 401);
      assert.equal(calls.backstageGet, 0);
      bodies.push(await res.text());
    }
    assert.equal(bodies[0], bodies[1]);
    assert.equal(JSON.parse(bodies[0]).code, code);
  }
});

test('check-team: a fresh v2 identity is accepted', async () => {
  const github_auth = await nowIdentity();
  const { fetchStub, calls } = stubFetch();
  const res = await withFetch(fetchStub, () => handleCheckTeam(
    post('/api/github/check-team', { name: 'free-team', github_auth }), env(), 'https://mctl.ai'));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { available: true });
  assert.equal(calls.backstageGet, 1);
});

// ── Callback ────────────────────────────────────────────────────────────────

async function callback(user, emails) {
  const e = { GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret', GITHUB_OAUTH_HMAC_KEY: KEY };
  const state = 'cd'.repeat(16);
  const stateSig = await hmacSign(state, KEY);
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const u = typeof input === 'string' ? input : input.url;
    if (u.endsWith('/login/oauth/access_token')) return Response.json({ access_token: 'gho_placeholder' });
    if (u.endsWith('/user/emails')) return Response.json(emails);
    if (u.endsWith('/user')) return Response.json(user);
    throw new Error(`unexpected fetch ${u}`);
  };
  try {
    const res = await worker.fetch(new Request(`https://mctl.ai/api/github/callback?code=c&state=${state}`, {
      headers: { Cookie: `__gh_state=${state}.${stateSig}` },
    }), e);
    return res.headers.get('Location');
  } finally {
    globalThis.fetch = original;
  }
}

function decode(location) {
  const encoded = location.split('#auth=')[1];
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
}

const GH_USER = { id: 583231, login: 'octocat', name: 'Октокот', email: 'public@example.com', avatar_url: 'a' };

test('callback: issues a signed v2 identity with the primary verified email', async () => {
  const loc = await callback(GH_USER, [
    { email: 'secondary@example.com', primary: false, verified: true },
    { email: 'octo@example.com', primary: true, verified: true },
  ]);
  const identity = decode(loc);
  assert.equal(identity.v, 2);
  assert.equal(identity.github_id, 583231);
  assert.equal(identity.email, 'octo@example.com');
  assert.equal(identity.name, 'Октокот');
  assert.equal(identity.html_url, 'https://github.com/octocat');
  const now = Math.floor(Date.now() / 1000);
  assert.ok(identity.exp > now && identity.exp <= now + IDENTITY_TTL_SECONDS);
  assert.equal((await verifyIdentity(identity, KEY, now)).ok, true);
});

test('callback: never falls back to the public profile email', async () => {
  for (const emails of [
    [],
    [{ email: 'octo@example.com', primary: true, verified: false }],
    [{ email: 'octo@example.com', primary: false, verified: true }],
    // Signed but unverifiable later: would lock the person into auth_format.
    [{ email: '', primary: true, verified: true }],
  ]) {
    const loc = await callback(GH_USER, emails);
    assert.equal(loc, 'https://mctl.ai/#auth_error=EMAIL_UNVERIFIED', JSON.stringify(emails));
  }
});

test('callback: a profile without a numeric id is a profile error', async () => {
  const loc = await callback({ ...GH_USER, id: '583231' }, [{ email: 'o@example.com', primary: true, verified: true }]);
  assert.equal(loc, 'https://mctl.ai/#auth_error=PROFILE_FETCH');
});
