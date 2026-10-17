import { verifySessionRevoker, revokedSubjectKey, SESSION_MAX_SECONDS } from './zitadel.js';

const ID = /^[1-9][0-9]{0,19}$/;
const PAGE_SIZE = 20;
const PROPAGATION_SECONDS = 60;
const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// One bounded KV page per request. The workflow retries 202 responses and the
// subject fence blocks old sessions/sign-in callbacks while KV converges.
export async function handleSessionRevocation(request, env, now = Math.floor(Date.now() / 1000)) {
  if (!env.SESSIONS || !env.SESSION_REVOCATION_SUBJECT || !env.SESSION_REVOCATION_AUDIENCE) {
    return reply(503, { error: 'Session revocation is not configured' });
  }
  const bearer = request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!bearer || bearer.length > 16384) return reply(401, { error: 'Service credential required' });
  const caller = await verifySessionRevoker(bearer, env, now);
  if (!caller.ok) return reply(caller.reason === 'jwks_unavailable' ? 503 : 403, { error: 'Service identity could not be verified' });
  const length = Number(request.headers.get('Content-Length'));
  if (!Number.isSafeInteger(length) || length <= 0 || length > 1024) return reply(400, { error: 'Bounded JSON body required' });
  let body;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: 'Invalid JSON' });
    const chunks = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); return reply(400, { error: 'Body too large' }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch { return reply(400, { error: 'Invalid JSON' }); }
  if (!body || typeof body.github_id !== 'string' || !ID.test(body.github_id) ||
      typeof body.subject !== 'string' || !ID.test(body.subject)) return reply(400, { error: 'Invalid customer identity' });

  const kv = env.SESSIONS;
  const markerKey = revokedSubjectKey(body.subject);
  try {
    const raw = await kv.get(markerKey);
    let state = raw ? JSON.parse(raw) : {
      v: 1, githubId: body.github_id, subject: body.subject, startedAt: now,
      cursor: '', phase: 0, matched: 0, scanned: 0, done: false,
    };
    if (state.v !== 1 || state.githubId !== body.github_id || state.subject !== body.subject ||
        !Number.isSafeInteger(state.startedAt) || state.startedAt > now ||
        typeof state.cursor !== 'string' || state.cursor.length > 4096 || ![0, 1].includes(state.phase) ||
        !Number.isSafeInteger(state.matched) || state.matched < 0 || !Number.isSafeInteger(state.scanned) || state.scanned < 0 || typeof state.done !== 'boolean') {
      throw new Error('Invalid revocation progress');
    }
    const save = () => kv.put(markerKey, JSON.stringify(state), { expirationTtl: SESSION_MAX_SECONDS + 300 });
    if (!raw) await save();
    if (!state.done) {
      const page = await kv.list({ prefix: 'sess:', limit: PAGE_SIZE, ...(state.cursor ? { cursor: state.cursor } : {}) });
      if (!page || !Array.isArray(page.keys) || typeof page.list_complete !== 'boolean' || page.keys.length > PAGE_SIZE ||
          (!page.list_complete && (typeof page.cursor !== 'string' || !page.cursor || page.cursor === state.cursor))) {
        throw new Error('Incomplete KV listing');
      }
      for (const key of page.keys) {
        if (typeof key.name !== 'string' || !key.name.startsWith('sess:')) throw new Error('Invalid session key');
        let identity = key.metadata;
        if (!identity || typeof identity.github_id !== 'string' || typeof identity.sub !== 'string') {
          const value = await kv.get(key.name);
          if (value === null) continue;
          identity = JSON.parse(value);
          if (!identity || typeof identity.github_id !== 'string' || typeof identity.sub !== 'string') throw new Error('Malformed session');
        }
        if (identity.github_id === body.github_id && identity.sub === body.subject) {
          await kv.delete(key.name);
          state.matched++;
        }
      }
      state.scanned += page.keys.length;
      // Work is bounded per request, not over the lifetime of a retryable job.
      // A cumulative key cap would permanently strand a large namespace.
      if (page.list_complete) {
        state.done = state.phase === 1 && state.matched === 0 && now - state.startedAt >= PROPAGATION_SECONDS;
        state.phase = 1; state.cursor = ''; state.matched = 0;
      } else { state.cursor = page.cursor; }
      await save();
    }
    const complete = state.done && now - state.startedAt >= PROPAGATION_SECONDS;
    return reply(complete ? 200 : 202, { github_id: body.github_id, subject: body.subject, complete });
  } catch {
    console.error('customer session revocation: observation or cleanup incomplete');
    return reply(503, { error: 'Session revocation incomplete; retry' });
  }
}
