// Fixed-window rate limiter, one Durable Object per (bucket, ip) key.
//
// Replaces the Cache API counter (mctlhq/mctl-web#84, #95), which was
//  - a sliding window: every write re-sent s-maxage, so each request pushed the
//    expiry out and a client retrying inside the window never got a fresh one;
//  - a non-atomic read-modify-write across separate cache calls, so a burst of
//    concurrent requests all read the same count and all passed.
// (Cloudflare's native Rate Limiting binding only supports 10s/60s periods; the
// form endpoints need 300s, hence a Durable Object.)
//
// A Durable Object runs one event at a time per instance and its input gate
// holds other events while a storage operation is in flight, so the
// get -> compute -> put below cannot interleave with another request for the
// same key. The window start and absolute expiry are stored, and only ever
// written when a window opens: retries inside a window never move them.

export function applyHit(record, now, windowSec) {
  if (!record || !(now < record.expiresAt)) {
    return { windowStart: now, expiresAt: now + windowSec * 1000, count: 1 };
  }
  return { windowStart: record.windowStart, expiresAt: record.expiresAt, count: record.count + 1 };
}

export class RateLimiter {
  constructor(state, env, now = () => Date.now()) {
    this.state = state;
    this.now = now;
  }

  async fetch(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('bad request', { status: 400 });
    }
    const { max, windowSec } = body || {};
    if (!Number.isInteger(max) || max < 1 || !Number.isInteger(windowSec) || windowSec < 1) {
      return new Response('bad request', { status: 400 });
    }
    const record = applyHit(await this.state.storage.get('w'), this.now(), windowSec);
    await this.state.storage.put('w', record);
    // Clean the row up once the window is over; a later hit opens a new one.
    await this.state.storage.setAlarm(record.expiresAt);
    return Response.json({ limited: record.count > max, count: record.count, expiresAt: record.expiresAt });
  }

  async alarm() {
    const record = await this.state.storage.get('w');
    if (record && this.now() >= record.expiresAt) await this.state.storage.deleteAll();
  }
}

// Failure policy (unchanged from the Cache API version, which had no try/catch):
// a missing binding, a failing stub call, a non-200 or a malformed body THROWS.
// The error propagates out of fetch() and the Worker answers with its platform
// error, so an unobservable limiter is neither "allowed" nor a fabricated 429.
export async function checkRateLimit(env, ip, bucket, maxRequests, windowSec) {
  const ns = env && env.RATE_LIMITER;
  if (!ns) throw new Error('rate limiter: RATE_LIMITER binding missing');
  const stub = ns.get(ns.idFromName(`${bucket}\n${ip}`));
  const res = await stub.fetch('https://rate-limiter.internal/hit', {
    method: 'POST',
    body: JSON.stringify({ max: maxRequests, windowSec }),
  });
  if (!res.ok) throw new Error(`rate limiter: unexpected status ${res.status}`);
  const out = await res.json();
  if (typeof out?.limited !== 'boolean') throw new Error('rate limiter: malformed response');
  return out.limited;
}
