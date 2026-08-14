import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  decryptSessionPayload,
  encryptSessionPayload,
  fragmentErrorLocation,
  fragmentSuccessLocation,
  isSessionId,
  landingErrorLocation,
  landingSuccessLocation,
  newSessionId,
  redeemFromCookie,
  sessionIsLive,
} from './index.js';

const workerSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'index.js'),
  'utf8',
);

test('landing success uses a fragment, not a query string', () => {
  const loc = landingSuccessLocation('https://mctl.ai', 'abc.def');
  assert.equal(loc, 'https://mctl.ai/#auth=abc.def');
  assert.equal(new URL(loc).search, '');
});

test('landing error uses a fragment, not a query string', () => {
  const loc = landingErrorLocation('https://mctl.ai', 'ACCESS_DENIED');
  assert.equal(loc, 'https://mctl.ai/#auth_error=ACCESS_DENIED');
  assert.equal(new URL(loc).search, '');
});

test('MCP redirect carries only an opaque session id', () => {
  const id = 'a'.repeat(64);
  const loc = fragmentSuccessLocation('https://docs.mctl.ai/mcp/connecting', id);
  assert.equal(loc, `https://docs.mctl.ai/mcp/connecting#session=${id}`);
  assert.doesNotMatch(loc, /access_token|token=/i);
  assert.doesNotMatch(loc, /#auth=/);
  assert.equal(new URL(loc).search, '');
});

test('MCP error redirect does not include a token', () => {
  const loc = fragmentErrorLocation('https://docs.mctl.ai/mcp/connecting', 'TOKEN_EXCHANGE');
  assert.equal(loc, 'https://docs.mctl.ai/mcp/connecting#auth_error=TOKEN_EXCHANGE');
  assert.doesNotMatch(loc, /access_token/i);
});

test('isSessionId accepts 32-byte hex and rejects anything else', () => {
  assert.equal(isSessionId('a'.repeat(64)), true);
  assert.equal(isSessionId(newSessionId()), true);
  assert.equal(isSessionId('xyz'), false);
  assert.equal(isSessionId('a'.repeat(63)), false);
  assert.equal(isSessionId(''), false);
});

test('encryptSessionPayload round-trips and is not plaintext JSON', async () => {
  const secret = 'test-hmac-key-for-aes-derivation';
  const payload = { login: 'mashkovd', token: 'gho_placeholder_not_a_real_token', sig: 'abc' };
  const packed = await encryptSessionPayload(payload, secret);
  assert.equal(typeof packed, 'string');
  assert.doesNotMatch(packed, /gho_|mashkovd|token/);
  assert.deepEqual(await decryptSessionPayload(packed, secret), payload);
  assert.equal(await decryptSessionPayload(packed, 'wrong-secret'), null);
  assert.equal(await decryptSessionPayload('not-valid', secret), null);
});

test('worker source never builds a redirect with ?auth= or access_token in the URL', () => {
  assert.doesNotMatch(workerSrc, /\$\{baseUrl\}\/\?auth=/);
  assert.doesNotMatch(workerSrc, /#auth=\$\{encoded\}/);
  assert.match(workerSrc, /#session=\$\{sessionId\}|#session=/);
});

test('cookie decrypt alone does not redeem; cache consume must hit', () => {
  const live = { token: 'gho_placeholder_not_a_real_token', exp: Date.now() + 60_000 };
  assert.equal(redeemFromCookie(live, null), null);
  assert.equal(redeemFromCookie(null, live), null);
  assert.equal(redeemFromCookie(live, live), live);
  const expired = { ...live, exp: Date.now() - 1 };
  assert.equal(redeemFromCookie(expired, live), null);
  assert.equal(sessionIsLive(expired), false);
  assert.equal(sessionIsLive(live), true);
  assert.equal(sessionIsLive(null), false);
});
