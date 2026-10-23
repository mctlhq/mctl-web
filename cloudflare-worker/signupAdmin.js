// PostgreSQL owns admission. These routes expose immutable submissions and
// deliver durable decisions for the narrowly configured lifecycle service.
import { verifySessionRevoker } from './zitadel.js';
import { invitationFields, readBoundedJson, INVITATION_RETENTION_SECONDS } from './invitations.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ID = /^[1-9][0-9]{0,19}$/;
const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function record(kv, id) {
  if (!UUID.test(id)) throw new Error('invalid_record');
  const value = await kv.get('request:' + id, 'json');
  if (value === null) return null;
  const fields = invitationFields(value);
  if (value?.version !== 1 || value.id !== id || !fields || !Number.isFinite(Date.parse(value.createdAt))) throw new Error('invalid_record');
  return { id, createdAt: value.createdAt, ...fields };
}
export async function invitationAllowed(env, githubId, now = Date.now()) {
  if (!env.ACCESS_REQUESTS) throw new Error('invitation_store_unavailable');
  const value = await env.ACCESS_REQUESTS.get('approved:' + githubId, 'json');
  if (value === null) return false;
  if (value?.version !== 1 || value.github_id !== githubId || !UUID.test(value.id) || !Number.isFinite(Date.parse(value.expires_at))) throw new Error('invalid_approval');
  return Date.parse(value.expires_at) > now;
}
export async function handleSignupAdmin(request, env, fetchImpl = fetch) {
  if (!env.ACCESS_REQUESTS || !env.SESSION_REVOCATION_SUBJECT || !env.SESSION_REVOCATION_AUDIENCE) return reply(503, { error: 'Invitation administration unavailable' });
  const token = request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token || token.length > 16384) return reply(401, { error: 'Service credential required' });
  const caller = await verifySessionRevoker(token, env, Math.floor(Date.now() / 1000));
  if (!caller.ok) return reply(caller.reason === 'jwks_unavailable' ? 503 : 403, { error: 'Service identity could not be verified' });
  return serveSignupAdmin(request, env, fetchImpl);
}
// Separate authenticated transport from deterministic storage/provider behavior.
export async function serveSignupAdmin(request, env, fetchImpl = fetch) {
  const url = new URL(request.url), prefix = '/api/internal/invitations';
  try {
    if (request.method === 'GET' && url.pathname === prefix + '/requests') {
      const cursor = url.searchParams.get('cursor') || '';
      if (cursor.length > 4096) return reply(400, { error: 'Invalid cursor' });
      const page = await env.ACCESS_REQUESTS.list({ prefix: 'request:', limit: 20, ...(cursor ? { cursor } : {}) });
      if (!page || !Array.isArray(page.keys) || page.keys.length > 20 || typeof page.list_complete !== 'boolean' || (!page.list_complete && (typeof page.cursor !== 'string' || !page.cursor || page.cursor === cursor || page.cursor.length > 4096))) throw new Error('invalid_listing');
      const seen = new Set(), records = [], issues = [];
      for (const key of page.keys) {
        if (typeof key?.name !== 'string' || !key.name.startsWith('request:') || seen.has(key.name)) throw new Error('invalid_listing');
        seen.add(key.name);
        const id = key.name.slice(8);
        if (!UUID.test(id)) throw new Error('invalid_listing');
        try {
          const value = await record(env.ACCESS_REQUESTS, id);
          if (value !== null) records.push(value);
        } catch { issues.push({ id, error: 'record_unreadable' }); }
      }
      return reply(200, { requests: records, issues, traversal_complete: page.list_complete, complete: page.list_complete && issues.length === 0, observation: issues.length ? 'partial' : 'complete', cursor: page.list_complete ? '' : page.cursor });
    }
    if (request.method === 'GET' && url.pathname.startsWith(prefix + '/requests/')) {
      const id = url.pathname.slice((prefix + '/requests/').length);
      if (!UUID.test(id)) return reply(400, { error: 'Invalid request ID' });
      const value = await record(env.ACCESS_REQUESTS, id);
      return value === null ? reply(404, { error: 'Request not found' }) : reply(200, value);
    }
    if (request.method !== 'POST' || url.pathname !== prefix + '/decision') return reply(404, { error: 'Not found' });
    const d = await readBoundedJson(request.body, 16384);
    if (!UUID.test(d?.request?.id) || !['approved', 'rejected'].includes(d.status) || typeof d.reason !== 'string' || d.reason.length < 3 || d.reason.length > 1000) return reply(400, { error: 'Invalid decision' });
    const original = await record(env.ACCESS_REQUESTS, d.request.id);
    if (!original || ['id', 'name', 'email', 'github', 'project'].some(k => original[k] !== d.request[k]) || Date.parse(original.createdAt) !== Date.parse(d.request.createdAt)) return reply(409, { error: 'Saved request differs' });
    let expiration;
    if (d.status === 'approved') {
      const expiry = Date.parse(d.expires_at);
      expiration = Math.ceil(expiry / 1000);
      if (typeof d.github_id !== 'string' || !ID.test(d.github_id) || typeof d.github_login !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(d.github_login) || !Number.isFinite(expiry) || expiration < Math.floor(Date.now() / 1000) + 60 || expiry > Date.now() + 7 * 86400000 + 60000) return reply(400, { error: 'Invalid approval' });
    }
    // The API owns the immutable decision and serializes delivery with a lease.
    // Bind retries to its full immutable payload before touching the UI mirror.
    const material = JSON.stringify({ request: original, status: d.status, reason: d.reason, actor: d.actor || '',
      github_id: d.status === 'approved' ? d.github_id : '', github_login: d.status === 'approved' ? d.github_login : '', expires_at: d.status === 'approved' ? d.expires_at : null });
    const decisionHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material)))].map(n => n.toString(16).padStart(2, '0')).join('');
    const receiptKey = 'decision-delivered:' + original.id;
    const receipt = await env.ACCESS_REQUESTS.get(receiptKey, 'json');
    if (receipt !== null) {
      if (receipt?.id !== original.id || typeof receipt.delivery_id !== 'string' || !receipt.delivery_id || !/^[a-f0-9]{64}$/.test(receipt.decision_hash)) throw new Error('invalid_receipt');
      if (receipt.status !== d.status || receipt.decision_hash !== decisionHash) return reply(409, { error: 'An immutable decision has already been delivered' });
      return reply(200, { id: receipt.id, delivery_id: receipt.delivery_id });
    }
    const intentKey = 'decision-intent:' + original.id;
    const intent = await env.ACCESS_REQUESTS.get(intentKey, 'json');
    if (intent !== null) {
      if (intent?.id !== original.id || !/^[a-f0-9]{64}$/.test(intent.decision_hash)) throw new Error('invalid_intent');
      if (intent.decision_hash !== decisionHash) return reply(409, { error: 'A different immutable decision is pending delivery' });
    } else {
      await env.ACCESS_REQUESTS.put(intentKey, JSON.stringify({ id: original.id, decision_hash: decisionHash }), { expirationTtl: INVITATION_RETENTION_SECONDS });
    }
    if (d.status === 'approved') {
      // Recheck the provider's minimum TTL immediately before writing.
      if (expiration < Math.floor(Date.now() / 1000) + 60) return reply(400, { error: 'Approval expires too soon' });
      const key = 'approved:' + d.github_id;
      const mirror = { version: 1, id: original.id, github_id: d.github_id, expires_at: d.expires_at };
      const previous = await env.ACCESS_REQUESTS.get(key, 'json');
      if (JSON.stringify(previous) !== JSON.stringify(mirror)) await env.ACCESS_REQUESTS.put(key, JSON.stringify(mirror), { expiration });
    }
    if (!env.RESEND_API_KEY) return reply(503, { error: 'Decision email unavailable' });
    const text = d.status === 'approved'
      ? `Your MCTL invitation has been approved for GitHub @${d.github_login}.\n\nWithin seven days, open https://mctl.ai/#request-access, choose "Already invited? Sign in" and continue with this GitHub account to request your workspace. Make sure that GitHub account has a verified primary email (GitHub > Settings > Emails). This invitation is tied to your GitHub identity.\n\nDecision: ${d.reason}\nRequest ID: ${original.id}`
      : `Your MCTL invitation request has been declined.\n\nDecision: ${d.reason}\n\nYou can contact us at https://mctl.ai/#contact.\nRequest ID: ${original.id}`;
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10000),
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'signup-decision/' + original.id + '/' + d.status },
      body: JSON.stringify({ from: 'MCTL <noreply@mctl.ai>', to: [original.email], subject: d.status === 'approved' ? 'Your MCTL invitation is ready' : 'Your MCTL invitation request', text }),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error('email_refused'); }
    const payload = await readBoundedJson(response.body, 32768);
    if (typeof payload?.id !== 'string' || !payload.id || payload.id.length > 200) throw new Error('invalid_email_receipt');
    await env.ACCESS_REQUESTS.put(receiptKey, JSON.stringify({ id: original.id, status: d.status, decision_hash: decisionHash, delivery_id: payload.id }), { expirationTtl: INVITATION_RETENTION_SECONDS });
    return reply(200, { id: original.id, delivery_id: payload.id });
  } catch {
    console.error('invitation administration: observation or delivery incomplete');
    return reply(503, { error: 'Invitation operation incomplete; retry' });
  }
}
