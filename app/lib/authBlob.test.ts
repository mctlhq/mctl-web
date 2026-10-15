import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTH_TTL_MS,
  decodeAuthFragment,
  isAuthResetCode,
  isExpired,
  makeStored,
  readStored,
} from './authBlob.ts'

const NOW = 1_800_000_000_000
const v1 = { login: 'octo', name: '', email: 'o@example.com', avatar_url: 'a', html_url: 'h', sig: 'ab' }
const v2 = { ...v1, v: 2, github_id: 42, exp: Math.floor(NOW / 1000) + 3600 }

test('a v1 identity within the client TTL is kept', () => {
  const stored = makeStored(v1, NOW)
  assert.equal(isExpired(stored, NOW + AUTH_TTL_MS - 1), false)
})

test('a v1 identity past the client TTL is dropped', () => {
  const stored = makeStored(v1, NOW)
  assert.equal(isExpired(stored, NOW + AUTH_TTL_MS), true)
})

test('a v2 identity past its signed exp is dropped before the client TTL', () => {
  const stored = makeStored(v2, NOW)
  assert.equal(isExpired(stored, NOW + 3600 * 1000 - 1), false)
  assert.equal(isExpired(stored, NOW + 3600 * 1000), true)
})

test('a v2 identity without a numeric exp counts as expired', () => {
  const { exp: _exp, ...noExp } = v2
  assert.equal(isExpired(makeStored(noExp, NOW), NOW), true)
  assert.equal(isExpired(makeStored({ ...v2, exp: '9999999999' }, NOW), NOW), true)
})

test('the identity is stored and read back unchanged, field for field', () => {
  const stored = readStored(JSON.parse(JSON.stringify(makeStored(v2, NOW))))
  assert.deepEqual(stored?.identity, v2)
  // An empty name stays empty: the client no longer substitutes the login.
  assert.equal(readStored(makeStored(v1, NOW))?.identity.name, '')
})

test('the pre-#133 flattened format is converted, not discarded', () => {
  const legacy = { ...v1, exp: NOW + 1000 }
  const stored = readStored(legacy)
  assert.deepEqual(stored, { identity: v1, clientExp: NOW + 1000 })
  assert.equal(isExpired(stored!, NOW), false)
})

test('malformed storage reads as no identity', () => {
  for (const raw of [null, 'x', [], {}, { login: 'a' }, { ...v1 }, { identity: { login: 'a' }, clientExp: 1 }]) {
    assert.equal(readStored(raw), null, JSON.stringify(raw))
  }
})

test('only auth_expired and auth_format reset the sign-in', () => {
  assert.equal(isAuthResetCode('auth_expired'), true)
  assert.equal(isAuthResetCode('auth_format'), true)
  for (const code of [undefined, null, '', 'unauthorized', 'AUTH_EXPIRED', 401]) {
    assert.equal(isAuthResetCode(code), false, String(code))
  }
})

test('the fragment decodes UTF-8 names byte for byte', () => {
  const identity = { ...v2, name: 'Дмитрий Ñandú' }
  const bytes = new TextEncoder().encode(JSON.stringify(identity))
  const b64url = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  assert.deepEqual(decodeAuthFragment(b64url), identity)
})

test('a Latin-1 fragment from the pre-#133 Worker still decodes', () => {
  const identity = { ...v1, name: 'Jos\u00e9' }
  const b64url = btoa(JSON.stringify(identity)).replace(/=+$/, '')
  assert.deepEqual(decodeAuthFragment(b64url), identity)
})
