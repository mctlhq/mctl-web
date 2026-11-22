import { RateLimiter } from './rateLimiter.js';

// Test double for the RATE_LIMITER Durable Object namespace.
const tick = () => new Promise((r) => setTimeout(r, 0));

// Fake DO storage whose operations yield to the event loop, so any caller that
// is not serialised really does interleave.
function fakeStorage() {
  const m = new Map();
  let alarm = null;
  return {
    async get(k) { await tick(); return m.get(k); },
    async put(k, v) { await tick(); m.set(k, structuredClone(v)); },
    async deleteAll() { await tick(); m.clear(); },
    async setAlarm(t) { await tick(); alarm = t; },
    get alarm() { return alarm; },
  };
}

// serialise=true models a Durable Object: one request at a time per id.
export function fakeNamespace({ clock, serialise = true }) {
  const objs = new Map();
  return {
    idFromName: (n) => n,
    get(id) {
      if (!objs.has(id)) {
        objs.set(id, { do: new RateLimiter({ storage: fakeStorage() }, {}, clock), chain: Promise.resolve() });
      }
      const o = objs.get(id);
      return {
        fetch(url, init) {
          const run = () => o.do.fetch(new Request(url, init));
          if (!serialise) return run();
          const p = o.chain.then(run);
          o.chain = p.catch(() => {});
          return p;
        },
      };
    },
    objs,
  };
}


// One shared namespace for tests that drive worker.fetch with a fresh env per
// request, as the Cache API mock used to be shared through globalThis.caches.
export let rateLimiterNs = fakeNamespace({ clock: () => Date.now() });
export function resetRateLimiter() {
  rateLimiterNs = fakeNamespace({ clock: () => Date.now() });
}
