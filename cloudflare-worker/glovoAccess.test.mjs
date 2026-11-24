import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGlovoAccess, serveGlovoAccess, glovoAccessCardText, GLOVO_ACCESS_MAILS, GLOVO_ACCESS_NOTIFY_PATH, GLOVO_ACCESS_SENDER } from './glovoAccess.js';

const key = 'a'.repeat(64);
const principal = 'prn_01HZZZZZZZZZZZZZZZZZZZZZZZ';
const link = 'https://api.mctl.ai/glovo/access-approvals/link?t=' + 'T'.repeat(43);
const card = () => ({ identity: 'google:a***', requested_at: '2026-11-20T10:00:00Z', expires_at: '2026-11-27T10:00:00Z', decide_url: link });
function fixture() {
  const data = new Map();
  const env = {
    GLOVO_ACCESS_NOTIFY_ENABLED: 'true', GLOVO_ACCESS_EMAIL_ENABLED: 'true', RESEND_API_KEY: 'test-secret', TELEGRAM_BOT_TOKEN: 'test-bot', TELEGRAM_CHAT_ID: '-1',
    ACCESS_REQUESTS: {
      async get(k) { return data.get(k) ?? null; },
      async put(k, raw, options) { data.set(k, JSON.parse(raw)); data.set('options:' + k, options); },
    },
  };
  return { env, data };
}
const post = body => new Request('https://mctl.ai' + GLOVO_ACCESS_NOTIFY_PATH, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
const refuse = async () => { throw new Error('provider must not be called'); };

test('switch off answers 503 before anything else and sends nothing', async () => {
  for (const value of [undefined, '', 'false', 'TRUE', '1']) {
    const { env, data } = fixture(); env.GLOVO_ACCESS_NOTIFY_ENABLED = value;
    env.SESSION_REVOCATION_SUBJECT = '1'; env.SESSION_REVOCATION_AUDIENCE = '2';
    const response = await handleGlovoAccess(post({ delivery_key: key, kind: 'lapsed', to: 'person@example.com' }), env, refuse);
    assert.equal(response.status, 503); assert.equal(data.size, 0);
  }
});

test('emails have their own switch: off, the card is sent and an email is refused with nothing stored', async () => {
  for (const value of [undefined, '', 'false', 'TRUE', '1']) {
    const { env, data } = fixture(); env.GLOVO_ACCESS_EMAIL_ENABLED = value;
    // The provider would accept the mail: only the switch stops it.
    let mails = 0;
    const willing = async () => { mails++; return Response.json({ id: 'mail-1' }); };
    for (const kind of ['approved', 'rejected', 'lapsed']) {
      const response = await serveGlovoAccess(post({ delivery_key: key, kind, to: 'person@example.com' }), env, willing);
      assert.equal(response.status, 503, kind); assert.deepEqual(await response.json(), { error: 'Glovo access emails are not enabled' });
      assert.equal(mails, 0); assert.equal(data.size, 0);
    }
    // A malformed email is still a 400, not a retry.
    assert.equal((await serveGlovoAccess(post({ delivery_key: key, kind: 'approved' }), env, refuse)).status, 400);
    const sent = await serveGlovoAccess(post({ delivery_key: key, kind: 'owner_card', card: card() }), env, async () => Response.json({ ok: true, result: { message_id: 7 } }));
    assert.equal(sent.status, 200); assert.equal(data.get('glovo-access-delivered:' + key).kind, 'owner_card');
  }
});

test('transport refuses a call without the service credential', async () => {
  const { env } = fixture();
  assert.equal((await handleGlovoAccess(post({ delivery_key: key, kind: 'lapsed', to: 'person@example.com' }), env, refuse)).status, 503);
  env.SESSION_REVOCATION_SUBJECT = '1'; env.SESSION_REVOCATION_AUDIENCE = '2';
  assert.equal((await handleGlovoAccess(post({ delivery_key: key, kind: 'lapsed', to: 'person@example.com' }), env, refuse)).status, 401);
});

test('each email kind sends its own fixed text once, from the no-reply sender, under a stable key', async () => {
  for (const kind of ['approved', 'rejected', 'lapsed']) {
    const { env, data } = fixture(); let calls = 0;
    const provider = async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.resend.com/emails'); assert.equal(options.redirect, 'manual');
      assert.equal(options.headers['Idempotency-Key'], 'glovo-access/' + kind + '/' + key);
      assert.deepEqual(JSON.parse(options.body), { from: 'MCTL <noreply@mctl.ai>', to: ['person@example.com'], subject: GLOVO_ACCESS_MAILS[kind].subject, text: GLOVO_ACCESS_MAILS[kind].text });
      return Response.json({ id: 'mail-' + kind });
    };
    const first = await serveGlovoAccess(post({ delivery_key: key, kind, to: 'person@example.com' }), env, provider);
    assert.equal(first.status, 200); assert.deepEqual(await first.json(), { delivery_key: key, delivery_id: 'mail-' + kind });
    // The receipt holds no address and answers the retry without a send.
    assert.deepEqual(data.get('glovo-access-delivered:' + key), { version: 1, delivery_key: key, kind, delivery_id: 'mail-' + kind });
    assert.ok(data.get('options:glovo-access-delivered:' + key).expirationTtl > 0);
    const again = await serveGlovoAccess(post({ delivery_key: key, kind, to: 'person@example.com' }), env, refuse);
    assert.equal(again.status, 200); assert.deepEqual(await again.json(), { delivery_key: key, delivery_id: 'mail-' + kind });
    assert.equal(calls, 1);
  }
  assert.equal(GLOVO_ACCESS_SENDER, 'MCTL <noreply@mctl.ai>');
});

test('the three texts are distinct, bilingual and say what the design says', () => {
  const { approved, rejected, lapsed } = GLOVO_ACCESS_MAILS;
  assert.equal(approved.subject, 'Your Glovo access is approved / Доступ к Glovo одобрен');
  assert.equal(rejected.subject, 'About your Glovo access request / О вашем запросе на доступ к Glovo');
  assert.equal(lapsed.subject, 'Your Glovo access request expired / Запрос на доступ к Glovo истёк');
  assert.match(approved.text, /^Hi,\n\nYour request for access to the MCTL Glovo connector was approved\./);
  assert.match(approved.text, /\n\n\nЗдравствуйте,\n\nВаш запрос на доступ к коннектору MCTL Glovo одобрен\./);
  assert.match(rejected.text, /^Thanks for asking\. We can't give access[\s\S]*\n\n\nСпасибо за запрос\./);
  assert.match(lapsed.text, /^Your request was not reviewed within 7 days[\s\S]*\n\n\nВаш запрос не рассмотрели за 7 дней/);
  for (const mail of [approved, rejected, lapsed]) assert.ok(mail.text.endsWith('\n\nMCTL'));
  assert.equal(new Set([approved.text, rejected.text, lapsed.text]).size, 3);
});

test('a key delivered as one kind cannot be reused for another', async () => {
  const { env } = fixture();
  assert.equal((await serveGlovoAccess(post({ delivery_key: key, kind: 'approved', to: 'person@example.com' }), env, async () => Response.json({ id: 'mail-1' }))).status, 200);
  assert.equal((await serveGlovoAccess(post({ delivery_key: key, kind: 'rejected', to: 'person@example.com' }), env, refuse)).status, 409);
});

test('owner card is one plain Telegram message with the link and no decision', async () => {
  const { env, data } = fixture(); let calls = 0;
  const provider = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.telegram.org/bottest-bot/sendMessage'); assert.equal(options.redirect, 'manual');
    const body = JSON.parse(options.body);
    assert.deepEqual(Object.keys(body).sort(), ['chat_id', 'disable_web_page_preview', 'text']);
    assert.equal(body.chat_id, '-1'); assert.equal(body.text, glovoAccessCardText(card()));
    // Masked identity and the link only: no principal id, no address.
    assert.equal(/prn_|@/.test(body.text), false); assert.ok(body.text.includes('google:a***')); assert.ok(body.text.includes(link));
    return Response.json({ ok: true, result: { message_id: 77 } });
  };
  const response = await serveGlovoAccess(post({ delivery_key: key, kind: 'owner_card', card: card() }), env, provider);
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { delivery_key: key, delivery_id: 'telegram:77' });
  assert.equal((await serveGlovoAccess(post({ delivery_key: key, kind: 'owner_card', card: card() }), env, refuse)).status, 200);
  assert.equal(calls, 1);
  assert.equal(JSON.stringify(data.get('glovo-access-delivered:' + key)).includes(principal), false);
  const text = glovoAccessCardText(card());
  assert.ok(text.includes(link)); assert.ok(text.includes('google:a***')); assert.match(text, /decides nothing/);
  assert.match(glovoAccessCardText({ ...card(), identity: '' }), /Who: not available/);
});

test('malformed notifications are refused before any send', async () => {
  const bad = [
    'not json', [], { kind: 'approved', to: 'person@example.com' },
    { delivery_key: 'A'.repeat(64), kind: 'approved', to: 'person@example.com' },
    { delivery_key: key, kind: 'revoked', to: 'person@example.com' },
    { delivery_key: key, kind: 'approved' },
    { delivery_key: key, kind: 'approved', to: 'Person <person@example.com>' },
    { delivery_key: key, kind: 'approved', to: 'a@example.com,b@example.com' },
    { delivery_key: key, kind: 'approved', to: 'person@example.com\nBcc: x@example.com' },
    { delivery_key: key, kind: 'approved', to: 'person@example.com', card: card() },
    { delivery_key: key, kind: 'owner_card', card: card(), to: 'person@example.com' },
    { delivery_key: key, kind: 'owner_card' },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), identity: 'google:alice' } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), identity: 'see https://example.org' } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), requested_at: 'yesterday' } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), expires_at: '2026-13-40T10:00:00Z' } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), decide_url: 'https://example.org/glovo/access-approvals/link?t=' + 'T'.repeat(43) } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), decide_url: 'https://api.mctl.ai.example.org/glovo/access-approvals/link?t=' + 'T'.repeat(43) } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), decide_url: 'https://api.mctl.ai/glovo/access-approvals/link' } },
    // A link that names a principal is refused: no principal id reaches the chat.
    { delivery_key: key, kind: 'owner_card', card: { ...card(), decide_url: 'https://api.mctl.ai/glovo/access-approvals/' + principal + '?t=' + 'T'.repeat(43) } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), decide_url: 'https://api.mctl.ai/glovo/access-approvals/' + principal } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), principal_id: principal, decide_url: link + '#' + principal } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), decide_url: link + '&next=https://example.org' } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), decide_url: link + '\nhttps://example.org' } },
    { delivery_key: key, kind: 'owner_card', card: { ...card(), decide_url: 'https://api.mctl.ai/release-approvals/x?t=' + 'T'.repeat(43) } },
  ];
  for (const body of bad) {
    const { env, data } = fixture();
    assert.equal((await serveGlovoAccess(post(body), env, refuse)).status, 400, JSON.stringify(body));
    assert.equal(data.size, 0);
  }
  const { env } = fixture();
  assert.equal((await serveGlovoAccess(new Request('https://mctl.ai' + GLOVO_ACCESS_NOTIFY_PATH), env, refuse)).status, 404);
});

test('decision page origin is configurable and never open', async () => {
  const { env } = fixture(); env.GLOVO_ACCESS_DECIDE_ORIGIN = 'https://api.example.test';
  const moved = { ...card(), decide_url: link.replace('https://api.mctl.ai', 'https://api.example.test') };
  const ok = async () => Response.json({ ok: true, result: { message_id: 1 } });
  assert.equal((await serveGlovoAccess(post({ delivery_key: key, kind: 'owner_card', card: card() }), env, refuse)).status, 400);
  assert.equal((await serveGlovoAccess(post({ delivery_key: key, kind: 'owner_card', card: moved }), env, ok)).status, 200);
  for (const origin of ['http://api.example.test', 'https://api.example.test/', 'https://']) {
    const f = fixture(); f.env.GLOVO_ACCESS_DECIDE_ORIGIN = origin;
    const url = origin + (origin.endsWith('/') ? '' : '/') + 'glovo/access-approvals/link?t=' + 'T'.repeat(43);
    assert.equal((await serveGlovoAccess(post({ delivery_key: key, kind: 'owner_card', card: { ...card(), decide_url: url } }), f.env, refuse)).status, 400, origin);
  }
});

test('an incomplete delivery is 503 and leaves no receipt', async () => {
  const mailFailures = [
    async () => { throw new Error('network'); },
    async () => new Response(null, { status: 302, headers: { Location: 'https://example.org' } }),
    async () => new Response('no', { status: 500 }),
    async () => Response.json({}),
    async () => new Response('not json'),
  ];
  for (const provider of mailFailures) {
    const { env, data } = fixture();
    assert.equal((await serveGlovoAccess(post({ delivery_key: key, kind: 'approved', to: 'person@example.com' }), env, provider)).status, 503);
    assert.equal(data.size, 0);
  }
  const cardFailures = [
    async () => { throw new Error('network'); },
    async () => new Response('no', { status: 403 }),
    async () => Response.json({ ok: false }),
    async () => Response.json({ ok: true, result: {} }),
  ];
  for (const provider of cardFailures) {
    const { env, data } = fixture();
    assert.equal((await serveGlovoAccess(post({ delivery_key: key, kind: 'owner_card', card: card() }), env, provider)).status, 503);
    assert.equal(data.size, 0);
  }
  for (const missing of ['RESEND_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']) {
    const { env } = fixture(); delete env[missing];
    const body = missing === 'RESEND_API_KEY' ? { delivery_key: key, kind: 'approved', to: 'person@example.com' } : { delivery_key: key, kind: 'owner_card', card: card() };
    assert.equal((await serveGlovoAccess(post(body), env, refuse)).status, 503, missing);
  }
});

test('an unreadable or malformed receipt is 503, never a second send', async () => {
  const body = { delivery_key: key, kind: 'approved', to: 'person@example.com' };
  const broken = fixture(); broken.env.ACCESS_REQUESTS.get = async () => { throw new Error('unavailable'); };
  assert.equal((await serveGlovoAccess(post(body), broken.env, refuse)).status, 503);
  for (const receipt of [{}, { version: 1, delivery_key: 'b'.repeat(64), kind: 'approved', delivery_id: 'x' }, { version: 1, delivery_key: key, kind: 'approved', delivery_id: '' }]) {
    const { env, data } = fixture(); data.set('glovo-access-delivered:' + key, receipt);
    assert.equal((await serveGlovoAccess(post(body), env, refuse)).status, 503);
  }
  // A send whose receipt cannot be stored is reported incomplete: the retry
  // reaches the provider again under the same idempotency key.
  const { env } = fixture(); env.ACCESS_REQUESTS.put = async () => { throw new Error('unavailable'); };
  assert.equal((await serveGlovoAccess(post(body), env, async () => Response.json({ id: 'mail-1' }))).status, 503);
});
