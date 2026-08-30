import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSessionResponsePayload,
  decryptSessionPayload,
  encryptSessionPayload,
  fragmentErrorLocation,
  fragmentSuccessLocation,
  getUnlimitedUsers,
  hmacSign,
  hmacVerify,
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

test('hmacVerify accepts a correct signature and rejects a wrong one', async () => {
  const secret = 'test-hmac-key';
  const sig = await hmacSign('mashkovd', secret);
  assert.equal(await hmacVerify('mashkovd', sig, secret), true);
  assert.equal(await hmacVerify('mashkovd', sig, 'other-secret'), false);
  assert.equal(await hmacVerify('someone-else', sig, secret), false);
});

test('hmacVerify rejects malformed or wrong-length signatures without throwing', async () => {
  const secret = 'test-hmac-key';
  assert.equal(await hmacVerify('mashkovd', 'not-hex!!', secret), false);
  assert.equal(await hmacVerify('mashkovd', 'ab', secret), false);
  assert.equal(await hmacVerify('mashkovd', '', secret), false);
  assert.equal(await hmacVerify('mashkovd', undefined, secret), false);
});

test('worker source never compares HMAC signatures with plain equality', () => {
  assert.doesNotMatch(workerSrc, /expected\s*===\s*signature/);
});

test('getUnlimitedUsers falls back to the historical default when unset', () => {
  assert.deepEqual(getUnlimitedUsers({}), ['mashkovd']);
  assert.deepEqual(getUnlimitedUsers(undefined), ['mashkovd']);
});

test('getUnlimitedUsers respects an explicit empty string (revocation)', () => {
  assert.deepEqual(getUnlimitedUsers({ UNLIMITED_USERS: '' }), []);
  assert.deepEqual(getUnlimitedUsers({ UNLIMITED_USERS: ' , ' }), []);
});

test('hmacVerify rejects lenient-hex signatures like "1g" groups', async () => {
  const secret = 'test-hmac-key-for-aes-derivation';
  const sig = await hmacSign('mashkovd', secret);
  const lenient = '1g' + sig.slice(2); // same length, non-hex second char
  assert.equal(await hmacVerify('mashkovd', lenient, secret), false);
});

test('getUnlimitedUsers parses a comma-separated env var', () => {
  assert.deepEqual(getUnlimitedUsers({ UNLIMITED_USERS: 'alice,bob' }), ['alice', 'bob']);
  assert.deepEqual(getUnlimitedUsers({ UNLIMITED_USERS: ' alice , bob ,' }), ['alice', 'bob']);
  assert.deepEqual(getUnlimitedUsers({ UNLIMITED_USERS: 'mashkovd' }), ['mashkovd']);
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

test('buildSessionResponsePayload passes token through for docs/mcp-shaped payloads', () => {
  const payload = {
    login: 'octocat',
    name: 'Octo Cat',
    avatar_url: 'https://example.com/avatar.png',
    html_url: 'https://github.com/octocat',
    sig: 'deadbeef',
    token: 'gho_placeholder_not_a_real_token',
    sessionId: 'abc123',
    exp: Date.now() + 60_000,
  };
  const result = buildSessionResponsePayload(payload);
  assert.equal('token' in result, true);
  assert.equal(result.token, payload.token);
});

test('buildSessionResponsePayload has no token key for tg-mcp-shaped payloads', () => {
  const payload = {
    login: 'octocat',
    name: 'Octo Cat',
    avatar_url: 'https://example.com/avatar.png',
    html_url: 'https://github.com/octocat',
    sig: 'deadbeef',
    sessionId: 'abc123',
    exp: Date.now() + 60_000,
  };
  const result = buildSessionResponsePayload(payload);
  assert.equal('token' in result, false);
});

test('buildSessionResponsePayload strips sessionId and exp', () => {
  const payload = {
    login: 'octocat',
    sig: 'deadbeef',
    sessionId: 'abc123',
    exp: Date.now() + 60_000,
  };
  const result = buildSessionResponsePayload(payload);
  assert.equal('sessionId' in result, false);
  assert.equal('exp' in result, false);
});

test('buildSessionResponsePayload drops fields not on the allowlist', () => {
  const payload = {
    login: 'octocat',
    sig: 'deadbeef',
    internal_id: 'should-not-leak',
  };
  const result = buildSessionResponsePayload(payload);
  assert.equal('internal_id' in result, false);
});

test('buildSessionResponsePayload passes through identity fields unchanged and invents no keys', () => {
  const payload = {
    login: 'octocat',
    name: 'Octo Cat',
    avatar_url: 'https://example.com/avatar.png',
    html_url: 'https://github.com/octocat',
    sig: 'deadbeef',
  };
  const result = buildSessionResponsePayload(payload);
  assert.deepEqual(result, payload);
  assert.equal('token' in result, false);
});
