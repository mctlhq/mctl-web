import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter, checkRateLimit } from './rateLimiter.js';
import { fakeNamespace } from './rateLimiterFake.mjs';

const tick = () => new Promise((r) => setTimeout(r, 0));
function fakeStorage() {
  const m = new Map();
  return { async get(k) { await tick(); return m.get(k); }, async put(k, v) { await tick(); m.set(k, structuredClone(v)); }, async deleteAll() { m.clear(); }, async setAlarm() {} };
}

const mkClock = (t = 1_000_000) => {
  const c = () => c.t;
  c.t = t;
  return c;
};

test('concurrent burst at the limit admits at most max', async () => {
  const clock = mkClock();
  const env = { RATE_LIMITER: fakeNamespace({ clock }) };
  const results = await Promise.all(
    Array.from({ length: 50 }, () => checkRateLimit(env, '1.2.3.4', 'POST /api/submit', 5, 300)));
  assert.equal(results.filter((limited) => !limited).length, 5);
  assert.equal(results.filter(Boolean).length, 45);
});

test('detector is red on a non-serialising limiter (old read-modify-write shape)', async () => {
  const clock = mkClock();
  const env = { RATE_LIMITER: fakeNamespace({ clock, serialise: false }) };
  const results = await Promise.all(
    Array.from({ length: 50 }, () => checkRateLimit(env, '1.2.3.4', 'POST /api/submit', 5, 300)));
  assert.ok(results.filter((limited) => !limited).length > 5, 'burst must leak without serialisation');
});

test('the window does not slide on retries', async () => {
  const clock = mkClock();
  const env = { RATE_LIMITER: fakeNamespace({ clock }) };
  const hit = () => checkRateLimit(env, 'ip', 'POST /api/contact', 3, 300);
  assert.equal(await hit(), false); // t0 opens the window
  clock.t += 100_000; assert.equal(await hit(), false);
  clock.t += 100_000; assert.equal(await hit(), false);
  // Keep hammering while limited, right up to the original expiry.
  clock.t += 99_000; assert.equal(await hit(), true);  // t0+299s
  assert.equal(await hit(), true);
  // At t0+300s the ORIGINAL window is over, however many retries came before.
  clock.t += 1_000; assert.equal(await hit(), false);
  assert.equal(await hit(), false);
  assert.equal(await hit(), false);
  assert.equal(await hit(), true);
});

test('stores an absolute expiry, set once per window', async () => {
  const clock = mkClock(5_000);
  const ns = fakeNamespace({ clock });
  const env = { RATE_LIMITER: ns };
  await checkRateLimit(env, 'ip', 'b', 10, 60);
  const st = ns.objs.get('b\nip').do.state.storage;
  assert.equal(st.alarm, 5_000 + 60_000);
  clock.t += 30_000;
  await checkRateLimit(env, 'ip', 'b', 10, 60);
  assert.equal(st.alarm, 5_000 + 60_000, 'a retry must not move the expiry');
});

test('buckets and ips are isolated', async () => {
  const clock = mkClock();
  const env = { RATE_LIMITER: fakeNamespace({ clock }) };
  assert.equal(await checkRateLimit(env, 'a', 'POST /x', 1, 60), false);
  assert.equal(await checkRateLimit(env, 'a', 'POST /x', 1, 60), true);
  assert.equal(await checkRateLimit(env, 'b', 'POST /x', 1, 60), false);
  assert.equal(await checkRateLimit(env, 'a', 'POST /y', 1, 60), false);
});

test('alarm clears an expired window only', async () => {
  const clock = mkClock();
  const ns = fakeNamespace({ clock });
  const env = { RATE_LIMITER: ns };
  await checkRateLimit(env, 'ip', 'b', 1, 60);
  const o = ns.objs.get('b\nip').do;
  await o.alarm(); // not expired yet
  assert.ok(await o.state.storage.get('w'));
  clock.t += 60_000;
  await o.alarm();
  assert.equal(await o.state.storage.get('w'), undefined);
});

test('failure policy: an unobservable limiter throws, never allows or blocks', async () => {
  await assert.rejects(checkRateLimit({}, 'ip', 'b', 1, 60), /binding missing/);
  const mk = (res) => ({ RATE_LIMITER: { idFromName: (n) => n, get: () => ({ fetch: async () => res }) } });
  await assert.rejects(checkRateLimit(mk(new Response('x', { status: 500 })), 'ip', 'b', 1, 60), /status 500/);
  await assert.rejects(checkRateLimit(mk(Response.json({})), 'ip', 'b', 1, 60), /malformed/);
  await assert.rejects(checkRateLimit(mk(new Response('not json')), 'ip', 'b', 1, 60));
  const boom = { RATE_LIMITER: { idFromName: (n) => n, get: () => ({ fetch: async () => { throw new Error('down'); } }) } };
  await assert.rejects(checkRateLimit(boom, 'ip', 'b', 1, 60), /down/);
});

test('invalid parameters are rejected by the object', async () => {
  const o = new RateLimiter({ storage: fakeStorage() });
  const r = await o.fetch(new Request('https://x/hit', { method: 'POST', body: JSON.stringify({ max: 0, windowSec: 60 }) }));
  assert.equal(r.status, 400);
});
