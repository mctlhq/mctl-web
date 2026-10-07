import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import worker, {
  FRAGMENT_FLOW_TARGETS,
  isFragmentFlow,
  buildSessionResponsePayload,
  decryptSessionPayload,
  encryptSessionPayload,
  fragmentErrorLocation,
  fragmentSuccessLocation,
  getUnlimitedUsers,
  hmacSign,
  hmacVerify,
  isSessionId,
  landingErrorLocation,
  landingSuccessLocation,
  newSessionId,
  redeemFromCookie,
  sessionIsLive,
} from './index.js';

const workerSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'index.js'),
  'utf8',
);

test('landing success uses a fragment, not a query string', () => {
  const loc = landingSuccessLocation('https://mctl.ai', 'abc.def');
  assert.equal(loc, 'https://mctl.ai/#auth=abc.def');
  assert.equal(new URL(loc).search, '');
});

test('landing error uses a fragment, not a query string', () => {
  const loc = landingErrorLocation('https://mctl.ai', 'ACCESS_DENIED');
  assert.equal(loc, 'https://mctl.ai/#auth_error=ACCESS_DENIED');
  assert.equal(new URL(loc).search, '');
});

test('MCP redirect carries only an opaque session id', () => {
  const id = 'a'.repeat(64);
  const loc = fragmentSuccessLocation('https://docs.mctl.ai/mcp/connecting', id);
  assert.equal(loc, `https://docs.mctl.ai/mcp/connecting#session=${id}`);
  assert.doesNotMatch(loc, /access_token|token=/i);
  assert.doesNotMatch(loc, /#auth=/);
  assert.equal(new URL(loc).search, '');
});

test('MCP error redirect does not include a token', () => {
  const loc = fragmentErrorLocation('https://docs.mctl.ai/mcp/connecting', 'TOKEN_EXCHANGE');
  assert.equal(loc, 'https://docs.mctl.ai/mcp/connecting#auth_error=TOKEN_EXCHANGE');
  assert.doesNotMatch(loc, /access_token/i);
});

test('isSessionId accepts 32-byte hex and rejects anything else', () => {
  assert.equal(isSessionId('a'.repeat(64)), true);
  assert.equal(isSessionId(newSessionId()), true);
  assert.equal(isSessionId('xyz'), false);
  assert.equal(isSessionId('a'.repeat(63)), false);
  assert.equal(isSessionId(''), false);
});

test('encryptSessionPayload round-trips and is not plaintext JSON', async () => {
  const secret = 'test-hmac-key-for-aes-derivation';
  const payload = { login: 'mashkovd', token: 'gho_placeholder_not_a_real_token', sig: 'abc' };
  const packed = await encryptSessionPayload(payload, secret);
  assert.equal(typeof packed, 'string');
  assert.doesNotMatch(packed, /gho_|mashkovd|token/);
  assert.deepEqual(await decryptSessionPayload(packed, secret), payload);
  assert.equal(await decryptSessionPayload(packed, 'wrong-secret'), null);
  assert.equal(await decryptSessionPayload('not-valid', secret), null);
});

test('worker source never builds a redirect with ?auth= or access_token in the URL', () => {
  assert.doesNotMatch(workerSrc, /\$\{baseUrl\}\/\?auth=/);
  assert.doesNotMatch(workerSrc, /#auth=\$\{encoded\}/);
  assert.match(workerSrc, /#session=\$\{sessionId\}|#session=/);
});

test('hmacVerify accepts a correct signature and rejects a wrong one', async () => {
  const secret = 'test-hmac-key';
  const sig = await hmacSign('mashkovd', secret);
  assert.equal(await hmacVerify('mashkovd', sig, secret), true);
  assert.equal(await hmacVerify('mashkovd', sig, 'other-secret'), false);
  assert.equal(await hmacVerify('someone-else', sig, secret), false);
});

test('hmacVerify rejects malformed or wrong-length signatures without throwing', async () => {
  const secret = 'test-hmac-key';
  assert.equal(await hmacVerify('mashkovd', 'not-hex!!', secret), false);
  assert.equal(await hmacVerify('mashkovd', 'ab', secret), false);
  assert.equal(await hmacVerify('mashkovd', '', secret), false);
  assert.equal(await hmacVerify('mashkovd', undefined, secret), false);
});

test('worker source never compares HMAC signatures with plain equality', () => {
  assert.doesNotMatch(workerSrc, /expected\s*===\s*signature/);
});

test('getUnlimitedUsers falls back to the historical default when unset', () => {
  assert.deepEqual(getUnlimitedUsers({}), ['mashkovd']);
  assert.deepEqual(getUnlimitedUsers(undefined), ['mashkovd']);
});

test('getUnlimitedUsers respects an explicit empty string (revocation)', () => {
  assert.deepEqual(getUnlimitedUsers({ UNLIMITED_USERS: '' }), []);
  assert.deepEqual(getUnlimitedUsers({ UNLIMITED_USERS: ' , ' }), []);
});

test('hmacVerify rejects lenient-hex signatures like "1g" groups', async () => {
  const secret = 'test-hmac-key-for-aes-derivation';
  const sig = await hmacSign('mashkovd', secret);
  const lenient = '1g' + sig.slice(2); // same length, non-hex second char
  assert.equal(await hmacVerify('mashkovd', lenient, secret), false);
});

test('getUnlimitedUsers parses a comma-separated env var', () => {
  assert.deepEqual(getUnlimitedUsers({ UNLIMITED_USERS: 'alice,bob' }), ['alice', 'bob']);
  assert.deepEqual(getUnlimitedUsers({ UNLIMITED_USERS: ' alice , bob ,' }), ['alice', 'bob']);
  assert.deepEqual(getUnlimitedUsers({ UNLIMITED_USERS: 'mashkovd' }), ['mashkovd']);
});

test('cookie decrypt alone does not redeem; cache consume must hit', () => {
  const live = { token: 'gho_placeholder_not_a_real_token', exp: Date.now() + 60_000 };
  assert.equal(redeemFromCookie(live, null), null);
  assert.equal(redeemFromCookie(null, live), null);
  assert.equal(redeemFromCookie(live, live), live);
  const expired = { ...live, exp: Date.now() - 1 };
  assert.equal(redeemFromCookie(expired, live), null);
  assert.equal(sessionIsLive(expired), false);
  assert.equal(sessionIsLive(live), true);
  assert.equal(sessionIsLive(null), false);
});

test('buildSessionResponsePayload passes token through for docs/mcp-shaped payloads', () => {
  const payload = {
    login: 'octocat',
    name: 'Octo Cat',
    avatar_url: 'https://example.com/avatar.png',
    html_url: 'https://github.com/octocat',
    sig: 'deadbeef',
    token: 'gho_placeholder_not_a_real_token',
    sessionId: 'abc123',
    exp: Date.now() + 60_000,
  };
  const result = buildSessionResponsePayload(payload);
  assert.equal('token' in result, true);
  assert.equal(result.token, payload.token);
});

test('buildSessionResponsePayload has no token key for a payload without one', () => {
  const payload = {
    login: 'octocat',
    name: 'Octo Cat',
    avatar_url: 'https://example.com/avatar.png',
    html_url: 'https://github.com/octocat',
    sig: 'deadbeef',
    sessionId: 'abc123',
    exp: Date.now() + 60_000,
  };
  const result = buildSessionResponsePayload(payload);
  assert.equal('token' in result, false);
});

test('buildSessionResponsePayload strips sessionId and exp', () => {
  const payload = {
    login: 'octocat',
    sig: 'deadbeef',
    sessionId: 'abc123',
    exp: Date.now() + 60_000,
  };
  const result = buildSessionResponsePayload(payload);
  assert.equal('sessionId' in result, false);
  assert.equal('exp' in result, false);
});

test('buildSessionResponsePayload drops fields not on the allowlist', () => {
  const payload = {
    login: 'octocat',
    sig: 'deadbeef',
    internal_id: 'should-not-leak',
  };
  const result = buildSessionResponsePayload(payload);
  assert.equal('internal_id' in result, false);
});

test('buildSessionResponsePayload passes through identity fields unchanged and invents no keys', () => {
  const payload = {
    login: 'octocat',
    name: 'Octo Cat',
    avatar_url: 'https://example.com/avatar.png',
    html_url: 'https://github.com/octocat',
    sig: 'deadbeef',
  };
  const result = buildSessionResponsePayload(payload);
  assert.deepEqual(result, payload);
  assert.equal('token' in result, false);
});

// ── Fragment flows (`?for=`) ────────────────────────────────────────────────

function mockCache() {
  const store = new Map();
  return {
    async match(req) {
      return store.has(req.url) ? new Response(store.get(req.url)) : undefined;
    },
    async put(req, res) {
      store.set(req.url, await res.clone().text());
    },
    async delete(req) {
      store.delete(req.url);
    },
  };
}

async function withMockCache(fn) {
  const original = globalThis.caches;
  globalThis.caches = { default: mockCache() };
  try {
    return await fn();
  } finally {
    globalThis.caches = original;
  }
}

const oauthEnv = () => ({
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  GITHUB_OAUTH_HMAC_KEY: 'test-hmac-key',
});

const setCookies = (res) => res.headers.getSetCookie();
const flowCookie = (res) =>
  setCookies(res).find((c) => c.startsWith('__gh_flow=') && !c.includes('Max-Age=0'));

test('docs is the only fragment flow', () => {
  assert.deepEqual(Object.keys(FRAGMENT_FLOW_TARGETS), ['docs']);
  assert.equal(isFragmentFlow('docs'), true);
});

test('retired and inherited names are not fragment flows', () => {
  for (const flow of ['mcp', 'tg-mcp', '', null, undefined, 'constructor', '__proto__', 'toString']) {
    assert.equal(isFragmentFlow(flow), false, `flow ${String(flow)}`);
  }
});

test('login: for=docs records the flow in a cookie', async () => {
  await withMockCache(async () => {
    const res = await worker.fetch(
      new Request('https://mctl.ai/api/github/login?for=docs'), oauthEnv());
    assert.equal(res.status, 302);
    assert.match(res.headers.get('Location'), /^https:\/\/github\.com\/login\/oauth\/authorize\?/);
    assert.match(flowCookie(res) || '', /^__gh_flow=docs;/);
  });
});

test('login: a retired or unknown flow takes the landing flow', async () => {
  await withMockCache(async () => {
    for (const flow of ['mcp', 'tg-mcp', 'constructor', 'nope']) {
      const res = await worker.fetch(
        new Request(`https://mctl.ai/api/github/login?for=${flow}`), oauthEnv());
      assert.equal(res.status, 302, `for=${flow}`);
      assert.equal(flowCookie(res), undefined, `for=${flow} must not set __gh_flow`);
    }
  });
});

function callbackError(flow) {
  return worker.fetch(
    new Request('https://mctl.ai/api/github/callback?error=access_denied', {
      headers: { Cookie: `__gh_flow=${flow}` },
    }),
    oauthEnv(),
  );
}

test('callback error: the docs flow returns to the docs page', async () => {
  const res = await callbackError('docs');
  assert.equal(res.status, 302);
  assert.equal(
    res.headers.get('Location'),
    fragmentErrorLocation(FRAGMENT_FLOW_TARGETS.docs, 'ACCESS_DENIED'),
  );
});

test('callback error: a retired or inherited flow cookie returns to the landing page', async () => {
  for (const flow of ['mcp', 'tg-mcp', 'constructor', '__proto__']) {
    const res = await callbackError(flow);
    assert.equal(res.status, 302, `flow ${flow}`);
    assert.equal(
      res.headers.get('Location'),
      landingErrorLocation('https://mctl.ai', 'ACCESS_DENIED'),
      `flow ${flow}`,
    );
  }
});

test('the worker names no retired flow target', () => {
  assert.equal(workerSrc.includes('labs-mctl-telegram.mctl.ai'), false);
  assert.equal(/['"]tg-mcp['"]\s*:/.test(workerSrc), false);
  assert.equal(/['"]mcp['"]\s*:/.test(workerSrc), false);
});

test('session redeem: the retired telegram origin is refused, docs is not', async () => {
  const redeem = (origin) => worker.fetch(
    new Request('https://mctl.ai/api/github/session', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'not-a-session' }),
    }),
    oauthEnv(),
  );
  await withMockCache(async () => {
    const refused = await redeem('https://labs-mctl-telegram.mctl.ai');
    assert.equal(refused.status, 403);
    assert.notEqual(
      refused.headers.get('Access-Control-Allow-Origin'), 'https://labs-mctl-telegram.mctl.ai');
    const docs = await redeem('https://docs.mctl.ai');
    assert.notEqual(docs.status, 403);
    assert.equal(docs.headers.get('Access-Control-Allow-Origin'), 'https://docs.mctl.ai');
  });
});
