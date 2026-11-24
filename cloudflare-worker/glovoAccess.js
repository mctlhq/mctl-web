// Glovo access notifications (mctlhq/mctl-glovo#82, stage C).
//
// mctl-api owns the access requests and the decisions. When one is worth
// telling, it posts a notification here, authenticated as the same
// customer-lifecycle machine as the invitation bridge, and this Worker
// delivers it:
//
//   - owner_card: a Telegram message to the review chat with a link to the
//     decision page. It decides nothing; the page asks for a fresh sign-in
//     with a second factor.
//   - approved, rejected, lapsed: a fixed email to the requester, from the
//     platform no-reply sender, with no reply-to. These have a switch of
//     their own, GLOVO_ACCESS_EMAIL_ENABLED, so the card can run without
//     them: until it is on, an address sent here is refused unread.
//
// The API serializes delivery with a lease and retries with the same
// delivery_key. A stored receipt answers a retry without sending again, and
// the mail provider gets the key as its idempotency key. The key is a hash:
// neither this Worker nor the provider learns who the principal is.
//
// Nothing here creates access. The email texts are the only content: no
// field of the request is ever copied into a mail.
import { verifySessionRevoker } from './zitadel.js';
import { readBoundedJson } from './invitations.js';

export const GLOVO_ACCESS_NOTIFY_PATH = '/api/internal/glovo-access/notify';
export const GLOVO_ACCESS_SENDER = 'MCTL <noreply@mctl.ai>';
const RECEIPT_TTL_SECONDS = 30 * 24 * 60 * 60;
const KEY = /^[a-f0-9]{64}$/;
const EMAIL_KINDS = ['approved', 'rejected', 'lapsed'];
// One bare address: no display name, list or header syntax.
const ADDRESS = /^[^\s@<>,;:"()[\]\\\x00-\x1f\x7f]+@[^\s@<>,;:"()[\]\\\x00-\x1f\x7f]+$/;
// The masked label mctl-api builds: a provider prefix and one character.
const IDENTITY = /^(?:github|google|mctl):[\p{L}\p{N}]\*\*\*$/u;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Design Appendix A, verbatim: the English text first, the Russian below it.
const APPROVED_EN = `Hi,

Your request for access to the MCTL Glovo connector was approved.

Next steps
1. In Claude, make sure the connector https://glovo.mctl.ai/mcp is added
   and that you signed in with Google.
2. Link your Glovo account (one time): open https://glovo.mctl.ai/link,
   read and accept the terms, then follow the steps there to install
   glovo-link. Your Glovo account must be able to sign in with a password
   or an email code. Accounts that only use Google or Facebook sign-in
   cannot be linked yet.
3. Ask Claude.

Things you can say (read-only)
- "Show my Glovo basket."
- "What did I order last month?"
- "What do I order most often?"
- "Plan a repeat of my last order."
- "Show the menu of <store>." / "Find <item> in <store>."
- "Which stores are available at my saved address?"

What it does not do: it does not change your basket, check out or pay.

Your data: your Glovo session is stored encrypted with a key held in Vault,
and only the service can decrypt it, for requests made with your MCTL
account. Unlinking deletes it at once (encrypted database backups age out
within 14 days). We cannot revoke the session at Glovo, so after unlinking,
sign out of other sessions in Glovo. You can unlink at any time
(glovo-link -unlink), and we can revoke access.

If Claude says your Glovo account is not linked or has expired, link it
again at https://glovo.mctl.ai/link.

MCTL`;

const APPROVED_RU = `Здравствуйте,

Ваш запрос на доступ к коннектору MCTL Glovo одобрен.

Что дальше
1. В Claude убедитесь, что коннектор https://glovo.mctl.ai/mcp добавлен и
   вы вошли через Google.
2. Привяжите аккаунт Glovo (один раз): откройте https://glovo.mctl.ai/link,
   прочитайте и примите условия, затем следуйте шагам там и установите
   glovo-link. В Glovo должен работать вход по паролю или коду из письма.
   Аккаунты, которые входят только через Google или Facebook, пока
   привязать нельзя.
3. Спрашивайте Claude.

Что можно сказать (только чтение)
- «Покажи мою корзину в Glovo.»
- «Что я заказывал в прошлом месяце?»
- «Что я заказываю чаще всего?»
- «Составь план повторного заказа.»
- «Покажи меню <магазина>.» / «Найди <товар> в <магазине>.»
- «Какие магазины доступны по моему сохранённому адресу?»

Чего сервис не делает: не меняет корзину, не оформляет и не оплачивает заказ.

Ваши данные: сессия Glovo хранится в зашифрованном виде, ключ находится в
Vault, расшифровать её может только сервис и только для запросов от вашего
аккаунта MCTL. Отвязка удаляет её сразу (зашифрованные резервные копии базы
устаревают в течение 14 дней). Мы не можем отозвать сессию на стороне Glovo,
поэтому после отвязки выйдите из остальных сессий в Glovo. Отвязать аккаунт
можно в любой момент (glovo-link -unlink), доступ мы тоже можем отозвать.

Если Claude пишет, что аккаунт Glovo не привязан или истёк, привяжите его
заново на https://glovo.mctl.ai/link.

MCTL`;

const REJECTED_EN = `Thanks for asking. We can't give access to the MCTL Glovo connector right
now: it is a small private pilot. You are welcome to ask again later at
https://glovo.mctl.ai/link.

MCTL`;

const REJECTED_RU = `Спасибо за запрос. Сейчас мы не можем открыть доступ к коннектору MCTL Glovo:
это небольшой закрытый пилот. Вы можете подать запрос снова позже на
https://glovo.mctl.ai/link.

MCTL`;

const LAPSED_EN = `Your request was not reviewed within 7 days and has expired. If you still
want access, ask again at https://glovo.mctl.ai/link.

MCTL`;

const LAPSED_RU = `Ваш запрос не рассмотрели за 7 дней, и он истёк. Если доступ всё ещё нужен,
подайте запрос снова на https://glovo.mctl.ai/link.

MCTL`;

const both = (en, ru) => en + '\n\n\n' + ru;

export const GLOVO_ACCESS_MAILS = Object.freeze({
  approved: Object.freeze({
    subject: 'Your Glovo access is approved / Доступ к Glovo одобрен',
    text: both(APPROVED_EN, APPROVED_RU),
  }),
  rejected: Object.freeze({
    subject: 'About your Glovo access request / О вашем запросе на доступ к Glovo',
    text: both(REJECTED_EN, REJECTED_RU),
  }),
  lapsed: Object.freeze({
    subject: 'Your Glovo access request expired / Запрос на доступ к Glovo истёк',
    text: both(LAPSED_EN, LAPSED_RU),
  }),
});

function decideOrigin(env) {
  const origin = env.GLOVO_ACCESS_DECIDE_ORIGIN || 'https://api.mctl.ai';
  return /^https:\/\/[a-z0-9.-]+(?::\d{1,5})?$/.test(origin) ? origin : null;
}

// The link must be the decide link on the configured origin with one token,
// and nothing else: it is the only caller-supplied text that reaches a
// person. It names no principal, so a principal id never reaches the chat.
function validDecideUrl(env, value) {
  const origin = decideOrigin(env);
  if (!origin || typeof value !== 'string' || !value.startsWith(origin + '/')) return false;
  return /^\/glovo\/access-approvals\/link\?t=[A-Za-z0-9_-]{43}$/.test(value.slice(origin.length));
}

function parse(env, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { delivery_key: key, kind } = body;
  if (typeof key !== 'string' || !KEY.test(key)) return null;
  if (kind === 'owner_card') {
    const card = body.card;
    if (body.to !== undefined || !card || typeof card !== 'object' || Array.isArray(card)) return null;
    const identity = card.identity === undefined ? '' : card.identity;
    if (typeof identity !== 'string' || (identity !== '' && !IDENTITY.test(identity))) return null;
    for (const field of ['requested_at', 'expires_at']) {
      if (typeof card[field] !== 'string' || !TIMESTAMP.test(card[field]) || !Number.isFinite(Date.parse(card[field]))) return null;
    }
    if (!validDecideUrl(env, card.decide_url)) return null;
    return { key, kind, card: { identity, requested_at: card.requested_at, expires_at: card.expires_at, decide_url: card.decide_url } };
  }
  if (!EMAIL_KINDS.includes(kind)) return null;
  if (body.card !== undefined || typeof body.to !== 'string' || body.to.length > 254 || !ADDRESS.test(body.to)) return null;
  return { key, kind, to: body.to };
}

export function glovoAccessCardText(card) {
  return [
    'MCTL Glovo: access request',
    'Who: ' + (card.identity || 'not available'),
    'Requested: ' + card.requested_at,
    'Expires: ' + card.expires_at,
    '',
    'Review and decide (a fresh sign-in with a second factor is required):',
    card.decide_url,
    '',
    'This message decides nothing. The link works for this request only, once, until it expires.',
  ].join('\n');
}

async function sendCard(env, card, fetchImpl) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) throw new Error('telegram_unconfigured');
  // Never log the request URL or a raw exception: the URL holds the bot token.
  let response;
  try {
    response = await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: glovoAccessCardText(card), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000), redirect: 'manual',
    });
  } catch { throw new Error('telegram_transport_failed'); }
  if (!response.ok) { await response.body?.cancel(); throw new Error('telegram_not_accepted'); }
  const payload = await readBoundedJson(response.body, 32768);
  if (payload?.ok !== true || !Number.isSafeInteger(payload.result?.message_id)) throw new Error('telegram_not_accepted');
  return 'telegram:' + payload.result.message_id;
}

async function sendMail(env, kind, key, to, fetchImpl) {
  if (!env.RESEND_API_KEY) throw new Error('email_unconfigured');
  const mail = GLOVO_ACCESS_MAILS[kind];
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json',
      'Idempotency-Key': 'glovo-access/' + kind + '/' + key,
    },
    body: JSON.stringify({ from: GLOVO_ACCESS_SENDER, to: [to], subject: mail.subject, text: mail.text }),
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error('email_refused'); }
  const payload = await readBoundedJson(response.body, 32768);
  if (typeof payload?.id !== 'string' || !payload.id || payload.id.length > 200) throw new Error('invalid_email_receipt');
  return payload.id;
}

export async function handleGlovoAccess(request, env, fetchImpl = fetch) {
  // Off unless switched on: a deployed Worker sends nothing by itself.
  if (env.GLOVO_ACCESS_NOTIFY_ENABLED !== 'true') return reply(503, { error: 'Glovo access notifications are not enabled' });
  if (!env.ACCESS_REQUESTS || !env.SESSION_REVOCATION_SUBJECT || !env.SESSION_REVOCATION_AUDIENCE) return reply(503, { error: 'Glovo access notifications unavailable' });
  const token = request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token || token.length > 16384) return reply(401, { error: 'Service credential required' });
  const caller = await verifySessionRevoker(token, env, Math.floor(Date.now() / 1000));
  if (!caller.ok) return reply(caller.reason === 'jwks_unavailable' ? 503 : 403, { error: 'Service identity could not be verified' });
  return serveGlovoAccess(request, env, fetchImpl);
}

// Separate authenticated transport from deterministic storage/provider behavior.
export async function serveGlovoAccess(request, env, fetchImpl = fetch) {
  if (request.method !== 'POST' || new URL(request.url).pathname !== GLOVO_ACCESS_NOTIFY_PATH) return reply(404, { error: 'Not found' });
  let body;
  try { body = await readBoundedJson(request.body, 8192); }
  catch { return reply(400, { error: 'Invalid notification' }); }
  const n = parse(env, body);
  if (!n) return reply(400, { error: 'Invalid notification' });
  // The emails are switched separately from the card. Off: nothing is sent,
  // looked up or stored for an email kind.
  if (n.kind !== 'owner_card' && env.GLOVO_ACCESS_EMAIL_ENABLED !== 'true') return reply(503, { error: 'Glovo access emails are not enabled' });
  try {
    const receiptKey = 'glovo-access-delivered:' + n.key;
    const receipt = await env.ACCESS_REQUESTS.get(receiptKey, 'json');
    if (receipt !== null) {
      if (receipt?.version !== 1 || receipt.delivery_key !== n.key || typeof receipt.kind !== 'string'
        || typeof receipt.delivery_id !== 'string' || !receipt.delivery_id || receipt.delivery_id.length > 200) throw new Error('invalid_receipt');
      if (receipt.kind !== n.kind) return reply(409, { error: 'Another notification was delivered under this key' });
      return reply(200, { delivery_key: n.key, delivery_id: receipt.delivery_id });
    }
    const deliveryId = n.kind === 'owner_card'
      ? await sendCard(env, n.card, fetchImpl)
      : await sendMail(env, n.kind, n.key, n.to, fetchImpl);
    await env.ACCESS_REQUESTS.put(receiptKey, JSON.stringify({ version: 1, delivery_key: n.key, kind: n.kind, delivery_id: deliveryId }), { expirationTtl: RECEIPT_TTL_SECONDS });
    return reply(200, { delivery_key: n.key, delivery_id: deliveryId });
  } catch {
    // No detail: an exception can quote a bot-token URL or an address.
    console.error('glovo access notification: delivery incomplete', n.kind);
    return reply(503, { error: 'Notification delivery incomplete; retry' });
  }
}
