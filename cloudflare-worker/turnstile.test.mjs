import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  verifyTurnstileToken,
  handleContactForm,
  handleFormSubmit,
  handleCheckTeam,
  hmacSign,
  default as worker,
} from './index.js';

// ─── Test helpers ────────────────────────────────────────────────────────────

const HMAC_KEY = 'test-hmac-key-for-turnstile-tests';
const LANDING_TOKEN = 'test-landing-token';

function baseEnv(overrides = {}) {
  return {
    TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    TELEGRAM_CHAT_ID: 'test-chat-id',
    BACKSTAGE_LANDING_TOKEN: LANDING_TOKEN,
    GITHUB_OAUTH_HMAC_KEY: HMAC_KEY,
    ...overrides,
  };
}

// Routes a stubbed fetch by target URL so handlers never hit the real
// network. Tracks call counts so tests can assert "Telegram/Backstage was
// (not) called".
function createFetchStub({
  turnstileResult = { success: true },
  telegramOk = true,
  backstageExistsStatus = 404,
  backstageCreateStatus = 202,
} = {}) {
  const calls = { turnstile: 0, telegram: 0, backstageGet: 0, backstagePost: 0 };

  const fetchStub = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.startsWith('https://challenges.cloudflare.com/turnstile/v0/siteverify')) {
      calls.turnstile += 1;
      return { ok: true, json: async () => turnstileResult };
    }

    if (url.startsWith('https://api.telegram.org/')) {
      calls.telegram += 1;
      return {
        ok: telegramOk,
        json: async () => ({ ok: telegramOk }),
        text: async () => (telegramOk ? '' : 'telegram send failed'),
      };
    }

    if (url.startsWith('https://api.resend.com/')) {
      return { ok: true, json: async () => ({ id: 'test-email-id' }) };
    }

    if (url.includes('/api/tenant-management/tenants')) {
      const method = options.method || 'GET';
      if (method === 'POST') {
        calls.backstagePost += 1;
        return {
          ok: backstageCreateStatus < 300,
          status: backstageCreateStatus,
          json: async () => ({ workflowName: 'create-tenant' }),
        };
      }
      calls.backstageGet += 1;
      return {
        ok: backstageExistsStatus >= 200 && backstageExistsStatus < 300,
        status: backstageExistsStatus,
        json: async () => ({}),
        text: async () => '',
      };
    }

    throw new Error(`turnstile.test.mjs: unexpected fetch to ${url}`);
  };

  return { fetchStub, calls };
}

async function withGlobalFetch(fetchStub, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchStub;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

function jsonRequest(url, body) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function readJson(res) {
  return res.json();
}

// ─── T1: verifyTurnstileToken ────────────────────────────────────────────────

test('verifyTurnstileToken: missing secret -> not_configured, never calls fetch', async () => {
  let called = false;
  const result = await verifyTurnstileToken('some-token', '', '1.2.3.4', async () => {
    called = true;
    return { ok: true, json: async () => ({ success: true }) };
  });
  assert.deepEqual(result, { success: false, reason: 'not_configured' });
  assert.equal(called, false);
});

test('verifyTurnstileToken: missing/empty token -> missing_token, never calls fetch', async () => {
  let called = false;
  const stub = async () => {
    called = true;
    return { ok: true, json: async () => ({ success: true }) };
  };
  assert.deepEqual(await verifyTurnstileToken(undefined, 'secret', '1.2.3.4', stub), {
    success: false,
    reason: 'missing_token',
  });
  assert.deepEqual(await verifyTurnstileToken('', 'secret', '1.2.3.4', stub), {
    success: false,
    reason: 'missing_token',
  });
  assert.equal(called, false);
});

test('verifyTurnstileToken: siteverify success -> success true', async () => {
  const result = await verifyTurnstileToken('good-token', 'secret', '1.2.3.4', async () => ({
    ok: true,
    json: async () => ({ success: true }),
  }));
  assert.equal(result.success, true);
});

test('verifyTurnstileToken: siteverify failure with error-codes -> that reason', async () => {
  const result = await verifyTurnstileToken('bad-token', 'secret', '1.2.3.4', async () => ({
    ok: true,
    json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
  }));
  assert.deepEqual(result, { success: false, reason: 'timeout-or-duplicate' });
});

test('verifyTurnstileToken: network error / thrown fetch -> network_error, never throws', async () => {
  const result = await verifyTurnstileToken('token', 'secret', '1.2.3.4', async () => {
    throw new Error('boom');
  });
  assert.deepEqual(result, { success: false, reason: 'network_error' });
});

test('verifyTurnstileToken: non-2xx siteverify response -> network_error', async () => {
  const result = await verifyTurnstileToken('token', 'secret', '1.2.3.4', async () => ({
    ok: false,
    json: async () => ({}),
  }));
  assert.deepEqual(result, { success: false, reason: 'network_error' });
});

// ─── T2: handleContactForm ────────────────────────────────────────────────────

test('handleContactForm: valid fields + valid token -> 200, Telegram called', async () => {
  const { fetchStub, calls } = createFetchStub({ turnstileResult: { success: true } });
  const res = await withGlobalFetch(fetchStub, () =>
    handleContactForm(
      jsonRequest('https://mctl.ai/api/contact', {
        name: 'Ada',
        email: 'ada@example.com',
        message: 'Hello there, this is a message.',
        turnstile_token: 'good-token',
      }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 200);
  const body = await readJson(res);
  assert.equal(body.success, true);
  assert.equal(calls.telegram, 1);
  assert.equal(calls.turnstile, 1);
});

test('handleContactForm: missing token -> 400, Telegram NOT called', async () => {
  const { fetchStub, calls } = createFetchStub();
  const res = await withGlobalFetch(fetchStub, () =>
    handleContactForm(
      jsonRequest('https://mctl.ai/api/contact', {
        name: 'Ada',
        email: 'ada@example.com',
        message: 'Hello there, this is a message.',
      }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 400);
  const body = await readJson(res);
  assert.equal(body.success, false);
  assert.doesNotMatch(body.message, /error-codes|missing_token|not_configured/);
  assert.equal(calls.telegram, 0);
});

test('handleContactForm: failing-verify token -> 400, Telegram NOT called', async () => {
  const { fetchStub, calls } = createFetchStub({
    turnstileResult: { success: false, 'error-codes': ['invalid-input-response'] },
  });
  const res = await withGlobalFetch(fetchStub, () =>
    handleContactForm(
      jsonRequest('https://mctl.ai/api/contact', {
        name: 'Ada',
        email: 'ada@example.com',
        message: 'Hello there, this is a message.',
        turnstile_token: 'bad-token',
      }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 400);
  const body = await readJson(res);
  assert.equal(body.success, false);
  assert.doesNotMatch(body.message, /invalid-input-response/);
  assert.equal(calls.telegram, 0);
});

test('handleContactForm: missing TURNSTILE_SECRET_KEY -> 500, Telegram NOT called', async () => {
  const { fetchStub, calls } = createFetchStub();
  const res = await withGlobalFetch(fetchStub, () =>
    handleContactForm(
      jsonRequest('https://mctl.ai/api/contact', {
        name: 'Ada',
        email: 'ada@example.com',
        message: 'Hello there, this is a message.',
        turnstile_token: 'good-token',
      }),
      baseEnv({ TURNSTILE_SECRET_KEY: undefined }),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 500);
  const body = await readJson(res);
  assert.equal(body.success, false);
  assert.equal(calls.telegram, 0);
  assert.equal(calls.turnstile, 0);
});

test('handleContactForm: existing shape validation still runs before Turnstile', async () => {
  const { fetchStub, calls } = createFetchStub();
  const res = await withGlobalFetch(fetchStub, () =>
    handleContactForm(
      jsonRequest('https://mctl.ai/api/contact', { name: '', email: '', message: '' }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 400);
  const body = await readJson(res);
  assert.equal(body.message, 'All fields are required');
  assert.equal(calls.turnstile, 0);
  assert.equal(calls.telegram, 0);
});

// ─── T3: handleFormSubmit ─────────────────────────────────────────────────────

async function authFor(login) {
  const sig = await hmacSign(login, HMAC_KEY);
  return { login, name: login, email: `${login}@example.com`, html_url: `https://github.com/${login}` , sig };
}

test('handleFormSubmit: valid github_auth + valid team + valid token -> proceeds to Backstage', async () => {
  const github_auth = await authFor('octocat');
  const { fetchStub, calls } = createFetchStub({ turnstileResult: { success: true } });
  const res = await withGlobalFetch(fetchStub, () =>
    handleFormSubmit(
      jsonRequest('https://mctl.ai/api/submit', {
        github_auth,
        team: 'my-team',
        usecase: 'testing',
        turnstile_token: 'good-token',
      }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 200);
  const body = await readJson(res);
  assert.equal(body.success, true);
  assert.equal(calls.backstagePost, 1);
});

test('handleFormSubmit: valid github_auth + valid team + missing token -> 400, Backstage NOT called', async () => {
  const github_auth = await authFor('octocat');
  const { fetchStub, calls } = createFetchStub();
  const res = await withGlobalFetch(fetchStub, () =>
    handleFormSubmit(
      jsonRequest('https://mctl.ai/api/submit', { github_auth, team: 'my-team', usecase: 'testing' }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 400);
  const body = await readJson(res);
  assert.equal(body.success, false);
  assert.equal(calls.backstageGet, 0);
  assert.equal(calls.backstagePost, 0);
  assert.equal(calls.telegram, 0);
});

test('handleFormSubmit: valid github_auth + valid team + invalid token -> 400, Backstage NOT called', async () => {
  const github_auth = await authFor('octocat');
  const { fetchStub, calls } = createFetchStub({
    turnstileResult: { success: false, 'error-codes': ['timeout-or-duplicate'] },
  });
  const res = await withGlobalFetch(fetchStub, () =>
    handleFormSubmit(
      jsonRequest('https://mctl.ai/api/submit', {
        github_auth,
        team: 'my-team',
        usecase: 'testing',
        turnstile_token: 'stale-token',
      }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 400);
  assert.equal(calls.backstageGet, 0);
  assert.equal(calls.backstagePost, 0);
});

test('handleFormSubmit: invalid github_auth.sig -> still 403 even with a valid token (order preserved)', async () => {
  const github_auth = { login: 'octocat', sig: 'not-a-real-signature-but-right-length-0000000000000000000000' };
  const { fetchStub, calls } = createFetchStub({ turnstileResult: { success: true } });
  const res = await withGlobalFetch(fetchStub, () =>
    handleFormSubmit(
      jsonRequest('https://mctl.ai/api/submit', {
        github_auth,
        team: 'my-team',
        usecase: 'testing',
        turnstile_token: 'good-token',
      }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 403);
  assert.equal(calls.turnstile, 0);
  assert.equal(calls.backstageGet, 0);
  assert.equal(calls.backstagePost, 0);
});

test('handleFormSubmit: missing github_auth -> 401, no Turnstile call needed', async () => {
  const { fetchStub, calls } = createFetchStub();
  const res = await withGlobalFetch(fetchStub, () =>
    handleFormSubmit(
      jsonRequest('https://mctl.ai/api/submit', { team: 'my-team', usecase: 'testing', turnstile_token: 'x' }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 401);
  assert.equal(calls.turnstile, 0);
});

// ─── T4: handleCheckTeam identity gate + non-disclosure ──────────────────────

const UNAUTH_BODY_JSON = JSON.stringify({ error: 'GitHub authentication required' });

test('handleCheckTeam: verified caller gets truthful available:false for an existing tenant', async () => {
  const github_auth = await authFor('octocat');
  const { fetchStub } = createFetchStub({ backstageExistsStatus: 200 });
  const res = await withGlobalFetch(fetchStub, () =>
    handleCheckTeam(
      jsonRequest('https://mctl.ai/api/github/check-team', { name: 'taken-team', github_auth }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 200);
  const body = await readJson(res);
  assert.equal(body.available, false);
});

test('handleCheckTeam: verified caller gets truthful available:true for a free name', async () => {
  const github_auth = await authFor('octocat');
  const { fetchStub } = createFetchStub({ backstageExistsStatus: 404 });
  const res = await withGlobalFetch(fetchStub, () =>
    handleCheckTeam(
      jsonRequest('https://mctl.ai/api/github/check-team', { name: 'free-team', github_auth }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 200);
  const body = await readJson(res);
  assert.equal(body.available, true);
});

test('handleCheckTeam: missing signature -> 401, byte-identical body for existing and non-existing names', async () => {
  const { fetchStub, calls } = createFetchStub();
  const resExisting = await withGlobalFetch(fetchStub, () =>
    handleCheckTeam(
      jsonRequest('https://mctl.ai/api/github/check-team', { name: 'taken-team' }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  const resFree = await withGlobalFetch(fetchStub, () =>
    handleCheckTeam(
      jsonRequest('https://mctl.ai/api/github/check-team', { name: 'free-team' }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(resExisting.status, 401);
  assert.equal(resFree.status, 401);
  const textExisting = await resExisting.text();
  const textFree = await resFree.text();
  assert.equal(textExisting, textFree);
  assert.equal(textExisting, UNAUTH_BODY_JSON);
  assert.equal(calls.backstageGet, 0);
});

test('handleCheckTeam: invalid signature -> 401, byte-identical to the missing-signature body', async () => {
  const github_auth = { login: 'octocat', sig: 'a'.repeat(64) };
  const { fetchStub, calls } = createFetchStub();
  const res = await withGlobalFetch(fetchStub, () =>
    handleCheckTeam(
      jsonRequest('https://mctl.ai/api/github/check-team', { name: 'any-team', github_auth }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 401);
  assert.equal(await res.text(), UNAUTH_BODY_JSON);
  assert.equal(calls.backstageGet, 0);
});

test('handleCheckTeam: Backstage 500 surfaces as 500, not swallowed into false availability', async () => {
  const github_auth = await authFor('octocat');
  const { fetchStub } = createFetchStub({ backstageExistsStatus: 500 });
  const res = await withGlobalFetch(fetchStub, () =>
    handleCheckTeam(
      jsonRequest('https://mctl.ai/api/github/check-team', { name: 'any-team', github_auth }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  assert.equal(res.status, 500);
});

test('handleCheckTeam: no failure response echoes the queried name', async () => {
  const { fetchStub } = createFetchStub();
  const res = await withGlobalFetch(fetchStub, () =>
    handleCheckTeam(
      jsonRequest('https://mctl.ai/api/github/check-team', { name: 'super-secret-probe-name' }),
      baseEnv(),
      'https://mctl.ai',
    ),
  );
  const text = await res.text();
  assert.doesNotMatch(text, /super-secret-probe-name/);
});

test('handleCheckTeam: query-string login/sig is not an accepted credential channel', async () => {
  const github_auth = await authFor('octocat');
  const { fetchStub, calls } = createFetchStub();
  // Credentials only in the query string, no JSON body at all.
  const req = new Request(
    `https://mctl.ai/api/github/check-team?login=${encodeURIComponent(github_auth.login)}&sig=${encodeURIComponent(github_auth.sig)}&name=any-team`,
    { method: 'POST' },
  );
  const res = await withGlobalFetch(fetchStub, () => handleCheckTeam(req, baseEnv(), 'https://mctl.ai'));
  assert.equal(res.status, 401);
  assert.equal(await res.text(), UNAUTH_BODY_JSON);
  assert.equal(calls.backstageGet, 0);
});

test('handleCheckTeam: malformed bodies all get 401, byte-identical to the plain unauthenticated 401', async () => {
  const { fetchStub, calls } = createFetchStub();
  const malformedBodies = [
    'not-json-at-all',
    '{}',
    JSON.stringify({ name: 'x' }),
    JSON.stringify({ name: 'x', github_auth: null }),
    JSON.stringify({ name: 'x', github_auth: 'str' }),
    JSON.stringify({ name: 'x', github_auth: { login: 'a' } }),
  ];

  for (const body of malformedBodies) {
    const res = await withGlobalFetch(fetchStub, () =>
      handleCheckTeam(jsonRequest('https://mctl.ai/api/github/check-team', body), baseEnv(), 'https://mctl.ai'),
    );
    assert.equal(res.status, 401, `expected 401 for body: ${body}`);
    assert.equal(await res.text(), UNAUTH_BODY_JSON, `expected fixed 401 body for: ${body}`);
  }
  assert.equal(calls.backstageGet, 0);
});

// ─── T5: rate limit for check-team ────────────────────────────────────────────

function createMockCache() {
  const store = new Map();
  return {
    async match(req) {
      const key = req.url;
      if (!store.has(key)) return undefined;
      return new Response(store.get(key));
    },
    async put(req, res) {
      store.set(req.url, await res.clone().text());
    },
    async delete(req) {
      store.delete(req.url);
    },
  };
}

test('rate limit: /api/github/check-team returns 429 with Retry-After once exceeded', async () => {
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: createMockCache() };
  const { fetchStub } = createFetchStub();
  try {
    await withGlobalFetch(fetchStub, async () => {
      let lastRes;
      // Unauthenticated body is fine — rate limiting happens before the
      // handler runs, so these never reach Backstage regardless.
      for (let i = 0; i < 21; i++) {
        lastRes = await worker.fetch(
          jsonRequest('https://mctl.ai/api/github/check-team', { name: 'probe' }),
          baseEnv(),
        );
      }
      assert.equal(lastRes.status, 429);
      assert.equal(lastRes.headers.get('Retry-After'), '60');
    });
  } finally {
    globalThis.caches = originalCaches;
  }
});

test('rate limit: requests under the limit are not rate limited', async () => {
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: createMockCache() };
  const { fetchStub } = createFetchStub();
  try {
    await withGlobalFetch(fetchStub, async () => {
      const res = await worker.fetch(
        jsonRequest('https://mctl.ai/api/github/check-team', { name: 'probe' }),
        baseEnv(),
      );
      assert.notEqual(res.status, 429);
    });
  } finally {
    globalThis.caches = originalCaches;
  }
});

// ─── The transitional GET shim is gone ───────────────────────────────────────

test('GET check-team is no longer routed and never answers available', async () => {
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: createMockCache() };
  let backstageCalled = false;
  const stub = async (url) => {
    if (String(url).includes('tenant')) backstageCalled = true;
    return new Response('{}', { status: 200 });
  };
  try {
    await withGlobalFetch(stub, async () => {
      const res = await worker.fetch(
        new Request('https://mctl.ai/api/github/check-team?name=some-tenant'),
        baseEnv(),
      );
      assert.equal(res.status, 404);
      // Pinned separately from the status: a future handler that answered this
      // route with anything carrying `available` would hand back the client-side
      // hint the identity gate exists to withhold, even at a non-200 status.
      const body = await res.text();
      assert.ok(!body.includes('available'), `GET leaked an availability hint: ${body}`);
      assert.equal(backstageCalled, false);
    });
  } finally {
    globalThis.caches = originalCaches;
  }
});

test('GET check-team stays uniform across an existing and a made-up name', async () => {
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: createMockCache() };
  const stub = async () => new Response('{}', { status: 200 });
  try {
    await withGlobalFetch(stub, async () => {
      // Held over from the shim's own suite. Removing the route must not
      // reintroduce the enumeration oracle by a different door — a 404 that
      // differed between a real and an invented tenant would be the same leak
      // in a new status code.
      const a = await worker.fetch(
        new Request('https://mctl.ai/api/github/check-team?name=admins'), baseEnv());
      const b = await worker.fetch(
        new Request('https://mctl.ai/api/github/check-team?name=zzz-does-not-exist'), baseEnv());
      assert.equal(a.status, b.status);
      assert.equal(await a.text(), await b.text());
    });
  } finally {
    globalThis.caches = originalCaches;
  }
});

test('an unrouted GET flood does not spend the POST budget (cross-origin img-tag DoS)', async () => {
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: createMockCache() };
  const stub = async () => new Response('{}', { status: 200 });
  const ip = '198.51.100.9';
  try {
    await withGlobalFetch(stub, async () => {
      // What a third-party page can do with nothing but <img> tags: CORS stops
      // it reading the response, not sending the request. Well past 20/min.
      for (let i = 0; i < 30; i++) {
        const res = await worker.fetch(
          new Request('https://mctl.ai/api/github/check-team?name=probe', {
            headers: { 'CF-Connecting-IP': ip },
          }),
          baseEnv(),
        );
        assert.equal(res.status, 404);
      }

      // The victim's real request, from the same IP, must be unaffected: the
      // budget it spends is a different bucket entirely.
      const real = await worker.fetch(
        new Request('https://mctl.ai/api/github/check-team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
          body: JSON.stringify({ name: 'probe' }),
        }),
        baseEnv(),
      );
      assert.notEqual(real.status, 429);
    });
  } finally {
    globalThis.caches = originalCaches;
  }
});

test('a GET flood does not spend the contact form budget either (3 per 5 min)', async () => {
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: createMockCache() };
  const stub = async () => new Response('{}', { status: 200 });
  const ip = '198.51.100.22';
  try {
    await withGlobalFetch(stub, async () => {
      // The cheapest instance of the same class, and pre-existing rather than
      // introduced here: at 3 per 5 minutes, three image tags on any page the
      // victim loaded used to lock them out of the contact form.
      for (let i = 0; i < 10; i++) {
        await worker.fetch(
          new Request('https://mctl.ai/api/contact', { headers: { 'CF-Connecting-IP': ip } }),
          baseEnv(),
        );
      }
      const real = await worker.fetch(
        new Request('https://mctl.ai/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
          body: JSON.stringify({ name: 'a', email: 'a@example.com', message: 'hi' }),
        }),
        baseEnv(),
      );
      assert.notEqual(real.status, 429);
    });
  } finally {
    globalThis.caches = originalCaches;
  }
});

test('POST check-team is still rate limited now that the exemption is gone', async () => {
  const originalCaches = globalThis.caches;
  globalThis.caches = { default: createMockCache() };
  const stub = async () => new Response('{}', { status: 200 });
  try {
    await withGlobalFetch(stub, async () => {
      // The exemption was written as `method === 'GET' && path === ...`, so a
      // careless removal could drop the whole `limit` lookup with it. Drive the
      // POST route past 20/min and require the 429 to still arrive.
      let last;
      for (let i = 0; i < 25; i++) {
        last = await worker.fetch(
          new Request('https://mctl.ai/api/github/check-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
            body: JSON.stringify({ name: 'probe' }),
          }),
          baseEnv(),
        );
      }
      assert.equal(last.status, 429);
    });
  } finally {
    globalThis.caches = originalCaches;
  }
});
