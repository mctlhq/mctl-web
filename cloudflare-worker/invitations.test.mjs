import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import worker from './index.js';
import { handleInvitationRequest, retryInvitations, notifyInvitation, INVITATION_RETENTION_SECONDS } from './invitations.js';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const body = { name: 'Octo', email: 'octo@example.com', github: 'octocat', project: 'Build a small service.', turnstile_token: 'verified' };
const id = '9e1ef291-c577-4aa1-b290-8644e0fa0607';
const record = { version: 1, id, createdAt: new Date().toISOString(), ...body };
delete record.turnstile_token;
const req = (data = body, origin = 'https://mctl.ai', header = '1') => new Request('https://mctl.ai/api/access-requests', {
  method: 'POST', headers: { Origin: origin, 'X-MCTL-Request': header, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
});
function fixture() {
  const rows = new Map(), writes = [], jobs = [];
  const env = { TURNSTILE_SECRET_KEY: 'test', TELEGRAM_BOT_TOKEN: 'secret-never-log', TELEGRAM_CHAT_ID: '123', ACCESS_REQUESTS: {
    async put(key, value, options) { writes.push({ key, value, options }); rows.set(key, value); },
    async get(key, type) { const v = rows.get(key) ?? null; return v === null || type !== 'json' ? v : JSON.parse(v); },
    async list() { return { keys: [...rows.keys()].filter(k => k.startsWith('request:')).map(name => ({ name })), list_complete: true }; },
  } };
  return { env, rows, writes, jobs, ctx: { waitUntil(p) { jobs.push(p); } } };
}
const goodVerification = async () => ({ success: true });
const accepted = async () => Response.json({ ok: true, result: { message_id: 17 } });

test('acceptance follows durable storage, keeps no token/IP and queues notification separately', async () => {
  const f = fixture(); delete f.env.TELEGRAM_BOT_TOKEN;
  const res = await handleInvitationRequest(req(), f.env, f.ctx, goodVerification);
  assert.equal(res.status, 202);
  const response = await res.json();
  const saved = JSON.parse(f.rows.get('request:' + response.requestId));
  assert.deepEqual({ name: saved.name, email: saved.email, github: saved.github, project: saved.project }, { name: body.name, email: body.email, github: body.github, project: body.project });
  assert.equal(saved.turnstile_token, undefined);
  assert.equal(saved.ip, undefined);
  assert.equal(f.writes[0].options.expirationTtl, INVITATION_RETENTION_SECONDS);
  // No network in the unit test; an unconfigured notification remains pending.
  await Promise.all(f.jobs);
});

test('a storage failure refuses acceptance and never queues a notification', async () => {
  const f = fixture(); f.env.ACCESS_REQUESTS.put = async () => { throw new Error('offline'); };
  const res = await handleInvitationRequest(req(), f.env, f.ctx, goodVerification);
  assert.equal(res.status, 503); assert.equal(f.jobs.length, 0);
});

test('origin/custom-header, validation and Turnstile refuse before any stored request', async () => {
  for (const [request, verify, status] of [
    [req(body, 'https://foreign.example'), goodVerification, 403],
    [req(body, 'https://mctl.ai', ''), goodVerification, 403],
    [req({ ...body, email: 'bad' }), goodVerification, 400],
    [req({ ...body, github: 'https://github.com/octocat' }), goodVerification, 400],
    [req({ ...body, project: 'x'.repeat(1001) }), goodVerification, 400],
    [req(), async () => ({ success: false }), 400],
    [req({ ...body, unknown: 'x'.repeat(9000) }), goodVerification, 413],
  ]) {
    const f = fixture();
    assert.equal((await handleInvitationRequest(request, f.env, f.ctx, verify)).status, status);
    assert.equal(f.writes.length, 0);
  }
});

test('a failed Telegram delivery leaves the durable request for scheduled recovery', async () => {
  const f = fixture(); f.rows.set('request:' + id, JSON.stringify(record));
  await assert.rejects(retryInvitations(f.env, async () => new Response('', { status: 503 })), /pending/);
  assert.ok(f.rows.has('request:' + id)); assert.ok(!f.rows.has('notified:' + id));
  await retryInvitations(f.env, accepted);
  assert.equal(JSON.parse(f.rows.get('notified:' + id)).messageId, 17);
  await retryInvitations(f.env, async () => { throw new Error('must not send twice'); });
});

test('HTTP 200 without provider acceptance is not a delivered notification', async () => {
  for (const payload of [{ ok: false, result: { message_id: 17 } }, { ok: false }, {}, { ok: true, result: {} }]) {
    const f = fixture();
    await assert.rejects(notifyInvitation(f.env, record, async () => Response.json(payload)));
    assert.equal(f.rows.has('notified:' + id), false);
  }
});

test('notifications identify provided contact information and cannot grant access', async () => {
  const f = fixture();
  await notifyInvitation(f.env, record, async (_url, options) => {
    const sent = JSON.parse(options.body);
    assert.equal(sent.chat_id, '123'); assert.match(sent.text, /not verified/);
    assert.match(sent.text, /No account, access or workspace/); assert.match(sent.text, new RegExp(id));
    assert.equal(sent.parse_mode, undefined); return accepted();
  });
});

test('failed/malformed listings never advance as a clean observed page', async () => {
  for (const list of [
    async () => { throw new Error('offline'); },
    async () => ({ keys: [], list_complete: false }),
  ]) {
    const f = fixture(); f.env.ACCESS_REQUESTS.list = list;
    await assert.rejects(retryInvitations(f.env, accepted));
    assert.equal(f.writes.length, 0);
  }
});

test('unreadable/corrupt records report failure but cannot starve a later healthy page', async () => {
  const laterId = '1f1ef291-c577-4aa1-b290-8644e0fa0607';
  for (const bad of ['{}', '{malformed', JSON.stringify({ ...record, version: 2 })]) {
    const f = fixture(); f.rows.set('request:' + id, bad);
    f.rows.set('request:' + laterId, JSON.stringify({ ...record, id: laterId }));
    f.env.ACCESS_REQUESTS.list = async options => options.cursor === 'healthy-page'
      ? { keys: [{ name: 'request:' + laterId }], list_complete: true }
      : { keys: [{ name: 'request:' + id }], list_complete: false, cursor: 'healthy-page' };
    await assert.rejects(retryInvitations(f.env, accepted), /pending/);
    assert.equal(f.rows.get('delivery-scan-cursor'), 'healthy-page');
    assert.equal(f.rows.has('notified:' + id), false);
    await retryInvitations(f.env, accepted);
    assert.equal(JSON.parse(f.rows.get('notified:' + laterId)).messageId, 17);
    assert.ok(f.rows.has('request:' + id));
  }
});

test('a rejected persisted cursor resets traversal and stays a failed observation until recovery', async () => {
  const f = fixture(); f.rows.set('delivery-scan-cursor', 'expired-cursor');
  f.rows.set('request:' + id, JSON.stringify(record));
  f.env.ACCESS_REQUESTS.list = async options => {
    if (options.cursor) throw new Error('cursor rejected');
    return { keys: [{ name: 'request:' + id }], list_complete: true };
  };
  await assert.rejects(retryInvitations(f.env, accepted), /listing_failed/);
  assert.equal(f.rows.get('delivery-scan-cursor'), '');
  assert.equal(f.rows.has('notified:' + id), false);
  await retryInvitations(f.env, accepted);
  assert.equal(JSON.parse(f.rows.get('notified:' + id)).messageId, 17);
});

test('a failing notification rotates a valid page so later requests are not starved', async () => {
  const f = fixture(); f.rows.set('request:' + id, JSON.stringify(record));
  f.env.ACCESS_REQUESTS.list = async options => {
    assert.equal(options.limit, 10); return { keys: [{ name: 'request:' + id }], list_complete: false, cursor: 'next-page' };
  };
  await assert.rejects(retryInvitations(f.env, async () => { throw new Error('offline'); }));
  assert.equal(f.rows.get('delivery-scan-cursor'), 'next-page');
});

test('signup status is closed unless the explicit public switch is true', async () => {
  for (const value of [undefined, 'false', 'true']) {
    const res = await worker.fetch(new Request('https://mctl.ai/api/signup-status'), { AUTH_FLOW_PUBLIC: value });
    assert.equal((await res.json()).invitationOnly, value !== 'true');
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
  }
});

test('invitation preflight permits the site custom header without advertising cookies', async () => {
  const response = await worker.fetch(new Request('https://mctl.ai/api/access-requests', {
    method: 'OPTIONS', headers: { Origin: 'https://mctl.ai' },
  }), {});
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://mctl.ai');
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
  assert.match(response.headers.get('Access-Control-Allow-Headers'), /X-MCTL-Request/);
});
