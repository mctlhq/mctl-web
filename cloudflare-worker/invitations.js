// Invitation requests never create accounts, grants or workspaces. Store the
// immutable request before acknowledging it; Telegram is an at-least-once
// notification of that record, with the same request ID on every retry.
import { csrfOk, zitadelConfig } from './zitadel.js';

export const INVITATION_RETENTION_SECONDS = 90 * 24 * 60 * 60;
const PREFIX = 'request:';
const CURSOR = 'delivery-scan-cursor';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const DELIVERY_ERRORS = new Set(['invalid_invitation_key', 'invalid_invitation_record', 'invalid_invitation_receipt', 'telegram_unconfigured', 'telegram_transport_failed', 'telegram_not_accepted', 'telegram_response_invalid']);
function deliveryFailure(error) {
  return DELIVERY_ERRORS.has(error?.message) ? error.message : 'delivery_observation_failed';
}

const EMAIL = /^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+$/;

export async function readBoundedJson(stream, maxBytes) {
  if (!stream) throw new Error('missing_body');
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('body_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export function invitationFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const field = key => typeof body[key] === 'string' ? body[key].trim() : null;
  const name = field('name'), email = field('email'), project = field('project');
  const github = field('github') ?? '';
  if (!name || name.length > 100 || /[\x00-\x1f]/.test(name)
      || !email || email.length > 254 || !EMAIL.test(email)
      || !project || project.length > 1000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(project)
      || (github && !GITHUB.test(github))) return null;
  return { name, email, github, project };
}

function reply(body, status, origin, cfg) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      ...(cfg.sessionOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    },
  });
}

export async function handleInvitationRequest(request, env, ctx, verifyTurnstile) {
  const cfg = zitadelConfig(env), origin = request.headers.get('Origin') || '';
  const respond = (body, status) => reply(body, status, origin, cfg);
  if (!csrfOk(request, cfg)) return respond({ code: 'forbidden' }, 403);
  if (!env.ACCESS_REQUESTS || !env.TURNSTILE_SECRET_KEY) {
    return respond({ code: 'unavailable' }, 503);
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return respond({ code: 'invalid_request' }, 415);
  }
  let body;
  try { body = await readBoundedJson(request.body, 8192); }
  catch (err) { return respond({ code: err.message === 'body_too_large' ? 'too_large' : 'invalid_request' }, err.message === 'body_too_large' ? 413 : 400); }
  const fields = invitationFields(body);
  if (!fields) return respond({ code: 'invalid_request' }, 400);
  const verification = await verifyTurnstile(body.turnstile_token, env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP'));
  if (!verification.success) return respond({ code: 'verification_failed' }, 400);
  const record = { version: 1, id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...fields };
  try {
    await env.ACCESS_REQUESTS.put(PREFIX + record.id, JSON.stringify(record), { expirationTtl: INVITATION_RETENTION_SECONDS });
  } catch {
    console.error('invitation: request storage failed');
    return respond({ code: 'unavailable' }, 503);
  }
  // A notification failure never changes an accepted request into an unsaved
  // one. The scheduled scan retries from the durable record, not process state.
  const delivery = notifyInvitation(env, record).catch(error => {
    console.error('invitation: delivery pending', record.id, deliveryFailure(error));
  });
  if (ctx?.waitUntil) ctx.waitUntil(delivery);
  else await delivery;
  return respond({ success: true, requestId: record.id }, 202);
}

function validRecord(record, id) {
  return record?.version === 1 && record.id === id && UUID.test(id)
    && typeof record.createdAt === 'string' && Number.isFinite(Date.parse(record.createdAt))
    && invitationFields(record);
}

export async function notifyInvitation(env, record, fetchImpl = fetch) {
  if (!validRecord(record, record?.id)) throw new Error('invalid_invitation_record');
  const receiptKey = 'notified:' + record.id;
  const receipt = await env.ACCESS_REQUESTS.get(receiptKey, 'json');
  if (receipt !== null) {
    if (receipt?.version !== 1 || receipt.id !== record.id || !Number.isSafeInteger(receipt.messageId)) {
      throw new Error('invalid_invitation_receipt');
    }
    return;
  }
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) throw new Error('telegram_unconfigured');
  const text = [
    'mctl.ai — Invitation request', 'Request ID: ' + record.id,
    'Name: ' + record.name, 'Email (provided): ' + record.email,
    'GitHub (provided, not verified): ' + (record.github || 'Not supplied'),
    '', 'Project (provided):', record.project.split('\n').map(line => '  ' + line).join('\n'), '', 'Received: ' + record.createdAt,
    '', 'Saved for review. No account, access or workspace has been created.',
  ].join('\n');
  // Never log the request URL or raw exception: the URL contains the bot token.
  let response;
  try {
    response = await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
      // Workers supports manual/follow only. Refuse redirects via !ok below.
      signal: AbortSignal.timeout(10_000), redirect: 'manual',
    });
  } catch { throw new Error('telegram_transport_failed'); }
  if (!response.ok) {
    console.error('invitation: Telegram HTTP refusal', record.id, response.status);
    await response.body?.cancel(); throw new Error('telegram_not_accepted');
  }
  let payload;
  try { payload = await readBoundedJson(response.body, 32768); }
  catch { throw new Error('telegram_response_invalid'); }
  if (payload?.ok !== true || !Number.isSafeInteger(payload.result?.message_id)) throw new Error('telegram_not_accepted');
  const expiration = Math.floor(Date.parse(record.createdAt) / 1000) + INVITATION_RETENTION_SECONDS + 86400;
  await env.ACCESS_REQUESTS.put(receiptKey, JSON.stringify({ version: 1, id: record.id, messageId: payload.result.message_id }), { expiration });
  console.info('invitation: notification accepted', record.id);
}

export async function retryInvitations(env, fetchImpl = fetch) {
  if (!env.ACCESS_REQUESTS) throw new Error('invitation_storage_unconfigured');
  const cursor = await env.ACCESS_REQUESTS.get(CURSOR);
  if (cursor !== null && (typeof cursor !== 'string' || cursor.length > 4096)) {
    await env.ACCESS_REQUESTS.put(CURSOR, '', { expirationTtl: INVITATION_RETENTION_SECONDS });
    throw new Error('invalid_scan_cursor');
  }
  let page;
  try {
    page = await env.ACCESS_REQUESTS.list({ prefix: PREFIX, limit: 10, ...(cursor ? { cursor } : {}) });
  } catch {
    // Reset only the traversal position, never a request or delivery receipt.
    // A rejected stale cursor can recover; this invocation still reports an
    // unknown/failed listing rather than an empty or successful queue.
    if (cursor) await env.ACCESS_REQUESTS.put(CURSOR, '', { expirationTtl: INVITATION_RETENTION_SECONDS });
    throw new Error('invitation_listing_failed');
  }
  // A failed or malformed read is never an empty successful scan.
  if (!page || !Array.isArray(page.keys) || page.keys.length > 10 || typeof page.list_complete !== 'boolean'
      || (!page.list_complete && (typeof page.cursor !== 'string' || !page.cursor || page.cursor.length > 4096))) throw new Error('invalid_invitation_listing');
  let failed = false;
  for (const key of page.keys) {
    let phase = 'key';
    const requestId = typeof key?.name === 'string' && key.name.startsWith(PREFIX) && UUID.test(key.name.slice(PREFIX.length)) ? key.name.slice(PREFIX.length) : 'unknown';
    try {
      if (typeof key?.name !== 'string' || !key.name.startsWith(PREFIX) || !UUID.test(key.name.slice(PREFIX.length))) {
        throw new Error('invalid_invitation_key');
      }
      phase = 'read';
      const record = await env.ACCESS_REQUESTS.get(key.name, 'json');
      if (record === null) continue; // Explicit KV absence (expiry or propagation).
      phase = 'record';
      if (!validRecord(record, key.name.slice(PREFIX.length))) throw new Error('invalid_invitation_record');
      phase = 'delivery';
      await notifyInvitation(env, record, fetchImpl);
    } catch (error) {
      // A corrupt/unreadable item is not a clean observation, but cannot
      // prevent every later page from receiving its retry. The failed scan
      // remains visible and revisits the item after the cursor wraps.
      failed = true;
      console.error('invitation: request retry pending', requestId, phase, deliveryFailure(error));
    }
  }
  // Always rotate after an observed complete page, even if Telegram is down:
  // one failing request must not starve later pages. Every record is revisited.
  await env.ACCESS_REQUESTS.put(CURSOR, page.list_complete ? '' : page.cursor, { expirationTtl: INVITATION_RETENTION_SECONDS });
  if (failed) throw new Error('invitation_deliveries_pending');
}
