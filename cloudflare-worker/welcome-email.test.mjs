import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handleFormSubmit, renderWelcomeEmail, signIdentity } from './index.js';

const HMAC_KEY = 'test-hmac-key-for-welcome-email-tests';

function baseEnv(overrides = {}) {
  return {
    TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    TELEGRAM_CHAT_ID: 'test-chat-id',
    BACKSTAGE_LANDING_TOKEN: 'test-landing-token',
    GITHUB_OAUTH_HMAC_KEY: HMAC_KEY,
    RESEND_API_KEY: 'test-resend-key',
    ...overrides,
  };
}

// Each provider can answer 2xx, answer an error status, or throw (network).
// `mode` is one of 'ok' | 'status' | 'throw'.
function createFetchStub({ resend = 'ok', telegram = 'ok', backstageCreateStatus = 202 } = {}) {
  const calls = { resend: [], telegram: 0, backstagePost: 0 };

  const respond = (mode, okBody) => {
    if (mode === 'throw') throw new TypeError('network down');
    const ok = mode === 'ok';
    return {
      ok,
      status: ok ? 200 : 503,
      json: async () => okBody,
      text: async () => (ok ? '' : 'provider unavailable'),
    };
  };

  const fetchStub = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('https://challenges.cloudflare.com/turnstile/v0/siteverify')) {
      return { ok: true, json: async () => ({ success: true }) };
    }
    if (url.startsWith('https://api.telegram.org/')) {
      calls.telegram += 1;
      return respond(telegram, { ok: true });
    }
    if (url.startsWith('https://api.resend.com/')) {
      calls.resend.push(JSON.parse(options.body));
      return respond(resend, { id: 'email-id' });
    }
    if (url.includes('/api/tenant-management/tenants')) {
      if ((options.method || 'GET') === 'POST') {
        calls.backstagePost += 1;
        return {
          ok: backstageCreateStatus < 300,
          status: backstageCreateStatus,
          json: async () => ({ workflowName: 'create-tenant' }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
    }
    throw new Error(`welcome-email.test.mjs: unexpected fetch to ${url}`);
  };

  return { fetchStub, calls };
}

async function submit(stubOptions, envOverrides = {}, authOverrides = {}) {
  const login = 'octocat';
  // authOverrides are applied after signing, i.e. they model a body that
  // differs from what the Worker signed.
  const github_auth = {
    ...(await signIdentity(
      { github_id: 583231, login, name: 'Octo <Cat>', email: 'octocat@example.com' },
      HMAC_KEY,
      Math.floor(Date.now() / 1000),
    )),
    ...authOverrides,
  };
  const { fetchStub, calls } = createFetchStub(stubOptions);
  const original = globalThis.fetch;
  const originalError = console.error;
  globalThis.fetch = fetchStub;
  console.error = () => {};
  try {
    const res = await handleFormSubmit(
      new Request('https://mctl.ai/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' },
        body: JSON.stringify({ github_auth, team: 'my-team', usecase: 'testing', turnstile_token: 'tok' }),
      }),
      baseEnv(envOverrides),
      'https://mctl.ai',
    );
    return { res, body: await res.json(), calls };
  } finally {
    globalThis.fetch = original;
    console.error = originalError;
  }
}

// ─── renderWelcomeEmail ──────────────────────────────────────────────────────

test('renderWelcomeEmail: states provisioning and the sign-in fact, nothing more', () => {
  const { subject, html, text } = renderWelcomeEmail({ name: 'Ada', team: 'my-team', year: 2031 });
  assert.equal(subject, 'Your MCTL workspace "my-team" is being provisioned');
  for (const part of [html, text]) {
    assert.match(part, /my-team/);
    assert.match(part, /Portal sign-in for self-service accounts is not available yet/);
    assert.match(part, /https:\/\/mctl\.ai\/#contact/);
    assert.match(part, /2031 MCTL/);
    // Removed promises and links: no GitHub sign-in instructions, no ArgoCD,
    // no portal link, no fixed provisioning time, no hardcoded year.
    assert.doesNotMatch(part, /github/i);
    assert.doesNotMatch(part, /argocd|ops\.mctl\.ai|app\.mctl\.ai/i);
    assert.doesNotMatch(part, /~2 min|2 minutes/);
    assert.doesNotMatch(part, /2025/);
  }
  // One call to action.
  assert.equal((html.match(/<a /g) || []).length, 1);
  // Brand palette, not the old neon cyan.
  assert.match(html, /#b83d28/);
  assert.doesNotMatch(html, /#00f5ff/i);
});

test('renderWelcomeEmail: escapes the GitHub display name in HTML', () => {
  const { html, text } = renderWelcomeEmail({ name: '<img src=x onerror=alert(1)>', team: 'my-team' });
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x/);
  assert.match(text, /<img src=x/); // plain text needs no escaping
});

test('renderWelcomeEmail: defaults the year to the current one', () => {
  const { html } = renderWelcomeEmail({ name: 'Ada', team: 'my-team' });
  assert.match(html, new RegExp(`${new Date().getUTCFullYear()} MCTL`));
});

// ─── handleFormSubmit: provider status ───────────────────────────────────────

test('submit: both providers accept -> 200, emailStatus accepted, email has html and text', async () => {
  const { res, body, calls } = await submit({});
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.emailStatus, 'accepted');
  assert.equal(calls.resend.length, 1);
  assert.equal(calls.resend[0].to[0], 'octocat@example.com');
  assert.ok(calls.resend[0].html.includes('Octo &lt;Cat&gt;'));
  assert.ok(calls.resend[0].text.includes('my-team'));
  assert.doesNotMatch(body.message, /Sign in to app\.mctl\.ai|~2 minutes/);
});

test('submit: Resend answers non-2xx -> still 200 success, emailStatus failed', async () => {
  const { res, body } = await submit({ resend: 'status' });
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.emailStatus, 'failed');
});

test('submit: Resend network error -> still 200 success, emailStatus failed', async () => {
  const { res, body } = await submit({ resend: 'throw' });
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.emailStatus, 'failed');
});

test('submit: Telegram network error -> still 200 success and the email is still sent', async () => {
  const { res, body, calls } = await submit({ telegram: 'throw' });
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.emailStatus, 'accepted');
  assert.equal(calls.resend.length, 1);
});

test('submit: Telegram non-2xx -> still 200 success', async () => {
  const { res, body } = await submit({ telegram: 'status' });
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
});

test('submit: no Telegram config -> Telegram not called, still 200 success', async () => {
  const { res, body, calls } = await submit({}, { TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '' });
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(calls.telegram, 0);
  assert.equal(body.emailStatus, 'accepted');
});

test('renderWelcomeEmail: card keeps a fixed width attribute for Outlook', () => {
  const { html } = renderWelcomeEmail({ name: 'Ada', team: 'my-team' });
  assert.match(html, /width="560"[^>]*max-width:560px/);
});

test('submit: no RESEND_API_KEY -> emailStatus skipped, Resend not called', async () => {
  const { body, calls } = await submit({}, { RESEND_API_KEY: '' });
  assert.equal(body.success, true);
  assert.equal(body.emailStatus, 'skipped');
  assert.equal(calls.resend.length, 0);
});

test('submit: an identity without an email is refused before any mail or workflow', async () => {
  const { res, body, calls } = await submit({}, {}, { email: '' });
  assert.equal(res.status, 401);
  assert.equal(body.code, 'auth_format');
  assert.equal(calls.resend.length, 0);
});

test('submit: workflow rejected -> 500, no welcome email', async () => {
  const { res, body, calls } = await submit({ backstageCreateStatus: 500 });
  assert.equal(res.status, 500);
  assert.equal(body.success, false);
  assert.equal(calls.resend.length, 0);
});
