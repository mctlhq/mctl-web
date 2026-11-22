import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handleContactForm, handleFormSubmit, sendTelegram, signIdentity } from './index.js';

// Boundary validation for the free-text fields of /api/contact and
// /api/submit, and the Telegram length cap. The cookie branch of
// /api/submit is covered in zitadel.test.mjs, next to its session helpers.

const HMAC_KEY = 'test-hmac-key-for-validation-tests';
const ORIGIN = 'https://mctl.ai';

function env() {
  return {
    TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    TELEGRAM_CHAT_ID: 'test-chat-id',
    BACKSTAGE_LANDING_TOKEN: 'test-landing-token',
    GITHUB_OAUTH_HMAC_KEY: HMAC_KEY,
  };
}

// Records every Telegram body and every Backstage POST. `telegramRejectsOver`
// mimics Telegram: a text longer than the cap is refused with a 400.
function stub() {
  const calls = { telegram: [], backstagePost: [] };
  const fetchStub = async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('https://challenges.cloudflare.com/')) {
      return { ok: true, json: async () => ({ success: true }) };
    }
    if (url.startsWith('https://api.telegram.org/')) {
      const body = JSON.parse(options.body);
      calls.telegram.push(body);
      const ok = body.text.length <= 4096;
      return { ok, status: ok ? 200 : 400, json: async () => ({ ok }), text: async () => (ok ? '' : 'message is too long') };
    }
    if (url.startsWith('https://api.resend.com/')) {
      return { ok: true, json: async () => ({ id: 'x' }) };
    }
    if (url.includes('/api/tenant-management/tenants')) {
      if ((options.method || 'GET') === 'POST') {
        calls.backstagePost.push(JSON.parse(options.body));
        return { ok: true, status: 202, json: async () => ({ workflowName: 'create-tenant' }) };
      }
      return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
    }
    throw new Error(`validation.test.mjs: unexpected fetch to ${url}`);
  };
  return { fetchStub, calls };
}

async function run(fetchStub, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchStub;
  const log = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
    console.error = log;
  }
}

function post(path, body) {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' },
    body: JSON.stringify(body),
  });
}

async function auth() {
  return signIdentity(
    { github_id: 583231, login: 'octocat', email: 'octocat@example.com', name: 'octocat' },
    HMAC_KEY, Math.floor(Date.now() / 1000));
}

const CONTACT_OK = { name: 'Ada', email: 'ada@example.com', message: 'Hello there, this is a message.', turnstile_token: 't' };

// ─── Contact form ─────────────────────────────────────────────────────────────

const contactCases = [
  // [label, patch, expected code, expected field]
  ['name as array', { name: ['Ada'] }, 'invalid_field_type', 'name'],
  ['name as number', { name: 7 }, 'invalid_field_type', 'name'],
  ['name as object', { name: { a: 1 } }, 'invalid_field_type', 'name'],
  ['name as null', { name: null }, 'invalid_field_type', 'name'],
  ['email as array', { email: ['ada@example.com'] }, 'invalid_field_type', 'email'],
  ['email as boolean', { email: true }, 'invalid_field_type', 'email'],
  ['message as array', { message: ['Hello there, this is a message.'] }, 'invalid_field_type', 'message'],
  ['message as object', { message: { toString: 'x' } }, 'invalid_field_type', 'message'],
  ['name 101 chars', { name: 'n'.repeat(101) }, 'field_too_long', 'name'],
  ['email 101 chars', { email: `${'e'.repeat(95)}@x.com` }, 'field_too_long', 'email'],
  ['message 1001 chars', { message: 'm'.repeat(1001) }, 'field_too_long', 'message'],
  ['message 100000 chars', { message: 'm'.repeat(100000) }, 'field_too_long', 'message'],
];

for (const [label, patch, code, field] of contactCases) {
  test(`contact: ${label} -> 400 ${code}, nothing sent`, async () => {
    const { fetchStub, calls } = stub();
    const res = await run(fetchStub, () =>
      handleContactForm(post('/api/contact', { ...CONTACT_OK, ...patch }), env(), ORIGIN));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.code, code);
    assert.equal(body.field, field);
    assert.equal(calls.telegram.length, 0);
  });
}

test('contact: fields exactly at the maxima are accepted and the notification fits', async () => {
  const { fetchStub, calls } = stub();
  const res = await run(fetchStub, () => handleContactForm(post('/api/contact', {
    ...CONTACT_OK,
    name: 'n'.repeat(100),
    email: `${'e'.repeat(90)}@x.com`.slice(0, 100),
    // Every character escapes to two, the worst case for the cap.
    message: '.'.repeat(1000),
  }), env(), ORIGIN));
  assert.equal(res.status, 200);
  assert.equal(calls.telegram.length, 1);
  assert.ok(calls.telegram[0].text.length <= 4096);
});

test('contact: absent fields keep the existing "all fields required" answer', async () => {
  const { fetchStub } = stub();
  const res = await run(fetchStub, () =>
    handleContactForm(post('/api/contact', { name: 'Ada' }), env(), ORIGIN));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).message, 'All fields are required');
});

// ─── /api/submit (signed GitHub identity) ─────────────────────────────────────

const submitCases = [
  ['team as array', { team: ['valid-team'] }, 'invalid_field_type', 'team'],
  ['team as number', { team: 12345 }, 'invalid_field_type', 'team'],
  ['team as object', { team: { a: 1 } }, 'invalid_field_type', 'team'],
  ['team as null', { team: null }, 'invalid_field_type', 'team'],
  ['team 101 chars', { team: 'a'.repeat(101) }, 'field_too_long', 'team'],
  ['usecase as array', { usecase: ['demo'] }, 'invalid_field_type', 'usecase'],
  ['usecase as number', { usecase: 5 }, 'invalid_field_type', 'usecase'],
  ['usecase as object', { usecase: { a: 1 } }, 'invalid_field_type', 'usecase'],
  ['usecase as null', { usecase: null }, 'invalid_field_type', 'usecase'],
  ['usecase 1001 chars', { usecase: 'u'.repeat(1001) }, 'field_too_long', 'usecase'],
  ['usecase 100000 chars', { usecase: 'u'.repeat(100000) }, 'field_too_long', 'usecase'],
];

for (const [label, patch, code, field] of submitCases) {
  test(`submit: ${label} -> 400 ${code}, nothing provisioned or sent`, async () => {
    const { fetchStub, calls } = stub();
    const res = await run(fetchStub, async () => handleFormSubmit(post('/api/submit', {
      github_auth: await auth(), team: 'my-team', usecase: 'demo', turnstile_token: 't', ...patch,
    }), env(), ORIGIN));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, code);
    assert.equal(body.field, field);
    assert.equal(calls.backstagePost.length, 0);
    assert.equal(calls.telegram.length, 0);
  });
}

test('submit: an absent usecase is allowed', async () => {
  const { fetchStub, calls } = stub();
  const res = await run(fetchStub, async () => handleFormSubmit(post('/api/submit', {
    github_auth: await auth(), team: 'my-team', turnstile_token: 't',
  }), env(), ORIGIN));
  assert.equal(res.status, 200);
  assert.equal(calls.backstagePost.length, 1);
});

test('submit: a usecase at the maximum still produces an accepted notification', async () => {
  const { fetchStub, calls } = stub();
  const res = await run(fetchStub, async () => handleFormSubmit(post('/api/submit', {
    github_auth: await auth(), team: 'my-team', usecase: '.'.repeat(1000), turnstile_token: 't',
  }), env(), ORIGIN));
  assert.equal(res.status, 200);
  assert.equal(calls.telegram.length, 1);
  assert.ok(calls.telegram[0].text.length <= 4096);
});

// ─── Telegram cap, independent of the input bounds ────────────────────────────
// The field bounds already keep every notification under the cap, so the cap
// is exercised directly: a drift in the bounds must still never produce a
// notification Telegram refuses.

function telegramSpy() {
  const sent = [];
  const fetchImpl = async (_url, options) => {
    const body = JSON.parse(options.body);
    sent.push(body);
    const ok = body.text.length <= 4096;
    return { ok, status: ok ? 200 : 400, text: async () => 'message is too long' };
  };
  return { sent, fetchImpl };
}

test('telegram: a message at the cap is sent unchanged, as MarkdownV2', async () => {
  const { sent, fetchImpl } = telegramSpy();
  const text = `head\n${'a'.repeat(4096 - 5)}`;
  assert.equal(text.length, 4096);
  assert.equal(await sendTelegram(env(), text, fetchImpl), 'accepted');
  assert.equal(sent[0].text, text);
  assert.equal(sent[0].parse_mode, 'MarkdownV2');
});

test('telegram: an over-long message is cut at a line boundary and still accepted', async () => {
  const { sent, fetchImpl } = telegramSpy();
  const lines = Array.from({ length: 80 }, (_, i) => `*line ${i}* ${'x'.repeat(100)}`);
  const text = lines.join('\n');
  assert.ok(text.length > 4096);
  assert.equal(await sendTelegram(env(), text, fetchImpl), 'accepted');
  const out = sent[0].text;
  assert.ok(out.length <= 4096);
  assert.equal(sent[0].parse_mode, 'MarkdownV2');
  // Whole lines only: the last kept line is complete, so its bold span closes.
  const kept = out.split('\n').slice(0, -1);
  assert.ok(kept.length > 0);
  for (const l of kept) assert.match(l, /^\*line \d+\* x{100}$/);
});

test('telegram: one over-long line is hard-cut and sent as plain text, never a dangling escape', async () => {
  const { sent, fetchImpl } = telegramSpy();
  const text = '\\.'.repeat(3000);
  assert.equal(await sendTelegram(env(), text, fetchImpl), 'accepted');
  assert.ok(sent[0].text.length <= 4096);
  assert.equal('parse_mode' in sent[0], false);
});

test('telegram: a hard cut does not split a surrogate pair', async () => {
  const { sent, fetchImpl } = telegramSpy();
  // Cut point (4095 - 1... ) lands inside an emoji for an odd prefix length.
  for (const pad of [0, 1]) {
    sent.length = 0;
    await sendTelegram(env(), 'a'.repeat(pad) + '😀'.repeat(3000), fetchImpl);
    assert.doesNotMatch(sent[0].text, /[\ud800-\udbff](?![\udc00-\udfff])/);
  }
});

test('telegram: a refused send is still reported as failed, not swallowed', async () => {
  const fetchImpl = async () => ({ ok: false, status: 400, text: async () => 'bad' });
  assert.equal(await run(fetchImpl, () => sendTelegram(env(), 'hi', fetchImpl)), 'failed');
});
