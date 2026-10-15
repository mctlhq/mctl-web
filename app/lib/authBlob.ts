// Client-side handling of the identity the Worker hands back after GitHub
// sign-in (mctl-web#133). The client treats that identity as an opaque signed
// object: it stores it, sends it back unchanged, and never rebuilds a field
// the Worker signs (rebuilding `name` from `login` used to be one way the body
// drifted from what was signed). Only expiry is interpreted here.
//
// Two formats are in circulation during the coordinated release:
// - v1 (current Worker): { login, name, email, avatar_url, html_url, sig },
//   no expiry of its own. Kept until the client TTL runs out, because the
//   Worker still issues exactly this; dropping it would sign people out on
//   every reload.
// - v2 (Worker after step 2): the same display fields plus `v: 2`,
//   `github_id`, and a signed `exp` in Unix seconds.
//
// Plain TypeScript with no Nuxt imports, so `node --test` runs it directly.

export const AUTH_TTL_MS = 8 * 60 * 60 * 1000

export type AuthIdentity = Record<string, unknown> & {
  login: string
  sig: string
}

export interface StoredAuth {
  identity: AuthIdentity
  // Client-side expiry in milliseconds, set when the identity was stored.
  clientExp: number
}

// 401 codes the Worker uses for a stale identity. Any other 401 keeps
// today's handling.
export const AUTH_RESET_CODES = ['auth_expired', 'auth_format'] as const

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function isIdentity(value: unknown): value is AuthIdentity {
  return (
    isObject(value) &&
    typeof value.login === 'string' &&
    value.login !== '' &&
    typeof value.sig === 'string' &&
    value.sig !== ''
  )
}

export function makeStored(identity: AuthIdentity, now: number): StoredAuth {
  return { identity, clientExp: now + AUTH_TTL_MS }
}

// Reads whatever localStorage holds. Before #133 the client stored the
// identity flattened together with its own `exp` in milliseconds; that shape
// is converted, not discarded, so an upgrade does not sign anyone out.
export function readStored(raw: unknown): StoredAuth | null {
  if (!isObject(raw)) return null
  if (isObject(raw.identity)) {
    if (!isIdentity(raw.identity) || typeof raw.clientExp !== 'number') return null
    return { identity: raw.identity, clientExp: raw.clientExp }
  }
  const { exp, ...identity } = raw
  if (!isIdentity(identity) || typeof exp !== 'number') return null
  return { identity, clientExp: exp }
}

// Whichever expiry comes first decides: the client TTL always applies, and a
// v2 identity is also dropped at its signed `exp` (both are 8 hours today, so
// the signed one normally decides). A v2 identity whose `exp` is missing or
// not a number is treated as expired: the Worker would reject it anyway.
export function isExpired(stored: StoredAuth, now: number): boolean {
  if (now >= stored.clientExp) return true
  if (stored.identity.v === 2) {
    const exp = stored.identity.exp
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return true
    return now >= exp * 1000
  }
  return false
}

export function isAuthResetCode(code: unknown): boolean {
  return typeof code === 'string' && (AUTH_RESET_CODES as readonly string[]).includes(code)
}

// Decodes the base64url fragment the Worker puts after `#auth=`. The JSON is
// UTF-8: a signed `name` with non-ASCII characters has to come back
// byte-for-byte, or the Worker's signature check fails on the next request.
// `atob` alone yields one character per byte, which mangles UTF-8; a fragment
// that is not valid UTF-8 (the pre-#133 Worker could only emit Latin-1) falls
// back to that byte-per-character reading.
export function decodeAuthFragment(encoded: string): unknown {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
  let json: string
  try {
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    json = binary
  }
  return JSON.parse(json)
}
