import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import worker, {
  getUnlimitedUsers,
  hmacSign,
  hmacVerify,
  landingErrorLocation,
  landingSuccessLocation,
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

test('worker source never builds a redirect with ?auth= or access_token in the URL', () => {
  assert.doesNotMatch(workerSrc, /\$\{baseUrl\}\/\?auth=/);
  assert.doesNotMatch(workerSrc, /#auth=\$\{encoded\}/);
  assert.doesNotMatch(workerSrc, /access_token=/);
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

// ── GitHub sign-in hands out no token (mctlhq/mctl-api#525) ─────────────────

const oauthEnv = () => ({
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  GITHUB_OAUTH_HMAC_KEY: 'test-hmac-key',
});

async function withMockCache(fn) {
  const store = new Map();
  const original = globalThis.caches;
  globalThis.caches = {
    default: {
      async match(req) {
        return store.has(req.url) ? new Response(store.get(req.url)) : undefined;
      },
      async put(req, res) {
        store.set(req.url, await res.clone().text());
      },
      async delete(req) {
        store.delete(req.url);
      },
    },
  };
  try {
    return await fn();
  } finally {
    globalThis.caches = original;
  }
}

test('login: every `for` value takes the landing flow', async () => {
  await withMockCache(async () => {
    for (const flow of ['docs', 'mcp', 'tg-mcp', 'constructor', 'nope']) {
      const res = await worker.fetch(
        new Request(`https://mctl.ai/api/github/login?for=${flow}`), oauthEnv());
      assert.equal(res.status, 302, `for=${flow}`);
      assert.match(res.headers.get('Location'), /^https:\/\/github\.com\/login\/oauth\/authorize\?/);
      const cookies = res.headers.getSetCookie();
      assert.equal(cookies.some((c) => c.startsWith('__gh_flow=')), false, `for=${flow} must not set __gh_flow`);
      assert.equal(cookies.some((c) => c.startsWith('__gh_origin=https://mctl.ai;')), true, `for=${flow}`);
    }
  });
});

test('callback error: a leftover docs flow cookie returns to the landing page', async () => {
  for (const flow of ['docs', 'mcp', 'tg-mcp', '__proto__']) {
    const res = await worker.fetch(
      new Request('https://mctl.ai/api/github/callback?error=access_denied', {
        headers: { Cookie: `__gh_flow=${flow}` },
      }),
      oauthEnv(),
    );
    assert.equal(res.status, 302, `flow ${flow}`);
    assert.equal(
      res.headers.get('Location'),
      landingErrorLocation('https://mctl.ai', 'ACCESS_DENIED'),
      `flow ${flow}`,
    );
  }
});

test('session redeem is gone: no origin gets a token back', async () => {
  await withMockCache(async () => {
    for (const origin of ['https://docs.mctl.ai', 'https://mctl.ai']) {
      const res = await worker.fetch(
        new Request('https://mctl.ai/api/github/session', {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'a'.repeat(64) }),
        }),
        oauthEnv(),
      );
      assert.equal(res.status, 404, origin);
      assert.equal(res.headers.get('Access-Control-Allow-Credentials'), null, origin);
    }
  });
});

test('the worker source carries no token handoff', () => {
  assert.equal(workerSrc.includes('/api/github/session'), false);
  assert.equal(workerSrc.includes('docs.mctl.ai/mcp/connecting'), false);
  assert.equal(workerSrc.includes('__gh_session'), false);
  assert.equal(workerSrc.includes('#session='), false);
  assert.doesNotMatch(workerSrc, /\btoken\s*=\s*accessToken/);
  assert.doesNotMatch(workerSrc, /\.token\s*=/);
});
