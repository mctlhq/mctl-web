/**
 * ZITADEL sign-in for mctl.ai with server-side sessions (mctl-web site
 * onboarding, stage C1a, docs/plans/site-onboarding-review.md).
 *
 * The website signs a person in through the `mctl-web` OIDC client of the
 * ZITADEL org `customers` (a public client with PKCE: the Worker holds no
 * client secret). The ID token never reaches the browser. It is stored in
 * Workers KV (binding SESSIONS) under `sess:<sha256(session id)>`, and the
 * browser keeps only the random session id in the `__Host-mctl_sid` cookie.
 *
 * A session proves who signed in; it authorizes nothing by itself. Every
 * cookie request that acts (team check, workspace request) re-presents the
 * stored ID token to the portal, which has mctl-api check it again, so a
 * revoked identity or a disabled principal is refused on the next request
 * even though KV may take up to a minute to forget a deleted session.
 *
 * Config (wrangler.toml [vars], except where noted):
 * - ZITADEL_ISSUER:          https://auth.mctl.ai
 * - ZITADEL_CLIENT_ID:       the mctl-web client id (mctl-web-dev in env.dev)
 * - ZITADEL_ORG_ID:          the `customers` org id; the authorize request is
 *                            scoped to it and the ID token must name it
 * - ZITADEL_GITHUB_IDP_ID:   the org's GitHub IdP, so the login page goes
 *                            straight to GitHub
 * - ZITADEL_REDIRECT_URI:    https://mctl.ai/api/zitadel/callback
 * - ZITADEL_POST_LOGOUT_URI: https://mctl.ai
 * - SESSION_ORIGINS:         comma-separated origins that may use the session
 *                            cookie (CSRF allowlist and post-sign-in targets)
 * - AUTH_FLOW_PUBLIC:        "true" opens the cookie branch to everyone;
 *                            anything else limits it to the test group
 * - AUTH_FLOW_TEST_GITHUB_IDS (wrangler secret): comma-separated numeric
 *                            GitHub ids of the test group
 */

export const SESSION_COOKIE = '__Host-mctl_sid';
export const LOGIN_COOKIE = '__Host-mctl_login';
export const SESSION_MAX_SECONDS = 8 * 60 * 60;
const LOGIN_MAX_SECONDS = 10 * 60;
// An ID token closer than this to its expiry is not worth a session.
const MIN_SESSION_SECONDS = 120;
const CLOCK_SKEW_SECONDS = 60;
const JWKS_TTL_MS = 5 * 60 * 1000;
const JWKS_REFRESH_MIN_MS = 60 * 1000;

const GITHUB_LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const GITHUB_ID_RE = /^[1-9][0-9]{0,19}$/;
// 32 random bytes, base64url without padding.
const SESSION_ID_RE = /^[A-Za-z0-9_-]{43}$/;

// ─── Config ──────────────────────────────────────────────────────────────────

export function zitadelConfig(env) {
  const list = (raw) => String(raw ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return {
    issuer: env.ZITADEL_ISSUER || 'https://auth.mctl.ai',
    clientId: env.ZITADEL_CLIENT_ID || '',
    orgId: env.ZITADEL_ORG_ID || '',
    idpId: env.ZITADEL_GITHUB_IDP_ID || '',
    redirectUri: env.ZITADEL_REDIRECT_URI || 'https://mctl.ai/api/zitadel/callback',
    postLogoutUri: env.ZITADEL_POST_LOGOUT_URI || 'https://mctl.ai',
    sessionOrigins: new Set(list(env.SESSION_ORIGINS || 'https://mctl.ai')),
    publicFlow: env.AUTH_FLOW_PUBLIC === 'true',
    testGithubIds: new Set(list(env.AUTH_FLOW_TEST_GITHUB_IDS).filter(id => GITHUB_ID_RE.test(id))),
    sessions: env.SESSIONS,
  };
}

// Everything the sign-in needs before it can start. A partial config fails
// closed: no redirect to ZITADEL, no session.
export function zitadelConfigured(cfg) {
  return Boolean(cfg.clientId && cfg.orgId && cfg.idpId && cfg.sessions);
}

// Whether this signed-in person may use the cookie branch of /api/team/check
// and /api/submit. Until the public switch only the test group may: a
// query parameter on the site changes the UI and grants nothing.
export function mayUseCookieFlow(cfg, session) {
  return cfg.publicFlow || cfg.testGithubIds.has(session.github_id);
}

// ─── Encoding helpers ────────────────────────────────────────────────────────

function base64url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function decodeJsonSegment(segment) {
  const bytes = base64urlDecode(segment);
  if (!bytes) return null;
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

export async function pkceChallenge(verifier) {
  return base64url(await sha256(verifier));
}

// The KV key of a session. The cookie value itself is never stored, so a
// read of the namespace does not hand out working session ids.
export async function sessionKey(sessionId) {
  const digest = await sha256(sessionId);
  return `sess:${Array.from(digest).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

function timingSafeEqualStrings(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ─── Cookies ─────────────────────────────────────────────────────────────────

export function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

// `__Host-` cookies: Secure, Path=/ and no Domain, so neither a subdomain nor
// a plain-HTTP page can set or overwrite them.
function hostCookie(name, value, maxAge) {
  return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return hostCookie(SESSION_COOKIE, '', 0);
}

function clearLoginCookie() {
  return hostCookie(LOGIN_COOKIE, '', 0);
}

// ─── CSRF ────────────────────────────────────────────────────────────────────
//
// Only for the cookie branch, which a browser attaches credentials to on its
// own. The custom header cannot be sent cross-origin without a CORS
// preflight, and the Origin must be one of the site's own. The legacy
// branch carries its credential in the body and is unchanged.

export function csrfOk(request, cfg) {
  const origin = request.headers.get('Origin') || '';
  return cfg.sessionOrigins.has(origin) && request.headers.get('X-MCTL-Request') === '1';
}

// CORS headers that let the site's own origins send the session cookie.
export function credentialCorsHeaders(origin, cfg) {
  return cfg.sessionOrigins.has(origin) ? { 'Access-Control-Allow-Credentials': 'true' } : {};
}

// ─── ID token verification ───────────────────────────────────────────────────

let jwksCache = { issuer: '', keys: [], fetchedAt: 0, refreshedAt: 0 };

// Test hook: forget cached keys between tests.
export function resetJwksCache() {
  jwksCache = { issuer: '', keys: [], fetchedAt: 0, refreshedAt: 0 };
}

async function fetchJwks(issuer) {
  const res = await fetch(`${issuer}/oauth/v2/keys`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`JWKS answered ${res.status}`);
  const body = await res.json();
  if (!body || !Array.isArray(body.keys)) throw new Error('JWKS without keys');
  return body.keys;
}

// The key for `kid`. A key that is not cached triggers one refetch, at most
// once a minute, so a key rotation is picked up without letting a stream of
// made-up kids turn into a stream of JWKS requests.
async function signingKey(issuer, kid, nowMs) {
  const fresh = jwksCache.issuer === issuer && nowMs - jwksCache.fetchedAt < JWKS_TTL_MS;
  let jwk = fresh ? jwksCache.keys.find(k => k.kid === kid) : undefined;
  if (!jwk && (!fresh || nowMs - jwksCache.refreshedAt >= JWKS_REFRESH_MIN_MS)) {
    const keys = await fetchJwks(issuer);
    jwksCache = { issuer, keys, fetchedAt: nowMs, refreshedAt: nowMs };
    jwk = keys.find(k => k.kid === kid);
  }
  if (!jwk || jwk.kty !== 'RSA' || (jwk.use && jwk.use !== 'sig')) return null;
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

/**
 * Verifies a ZITADEL ID token for the mctl-web client and returns its claims,
 * or `{ ok: false, reason }`. Checks: RS256 signature by a key of the issuer,
 * iss, aud containing the client, azp equal to the client, exp and iat, the
 * nonce of this sign-in, and that the token belongs to the `customers` org.
 */
export async function verifyIdToken(idToken, cfg, { nonce, nowSeconds }) {
  if (typeof idToken !== 'string') return { ok: false, reason: 'malformed' };
  const parts = idToken.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const header = decodeJsonSegment(parts[0]);
  const claims = decodeJsonSegment(parts[1]);
  const signature = base64urlDecode(parts[2]);
  if (!header || !claims || !signature) return { ok: false, reason: 'malformed' };
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') return { ok: false, reason: 'alg' };

  let key;
  try {
    key = await signingKey(cfg.issuer, header.kid, nowSeconds * 1000);
  } catch (e) {
    console.error('zitadel: JWKS fetch failed:', e?.message ?? e);
    return { ok: false, reason: 'jwks_unavailable' };
  }
  if (!key) return { ok: false, reason: 'unknown_key' };
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed)) {
    return { ok: false, reason: 'signature' };
  }

  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== cfg.issuer) return { ok: false, reason: 'iss' };
  if (!aud.includes(cfg.clientId) || claims.azp !== cfg.clientId) return { ok: false, reason: 'aud' };
  if (!Number.isSafeInteger(claims.exp) || claims.exp <= nowSeconds) return { ok: false, reason: 'expired' };
  if (!Number.isSafeInteger(claims.iat) || claims.iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: 'iat' };
  }
  if (!timingSafeEqualStrings(claims.nonce, nonce)) return { ok: false, reason: 'nonce' };
  if (claims['urn:zitadel:iam:user:resourceowner:id'] !== cfg.orgId) return { ok: false, reason: 'org' };
  if (typeof claims.sub !== 'string' || !claims.sub) return { ok: false, reason: 'sub' };
  return { ok: true, claims };
}

/**
 * The person behind verified claims, or `{ ok: false, reason }`. The GitHub
 * claims are written by mctl-api's identity hook from the GitHub id bound to
 * the account; a refusal or a token without them means the hook did not
 * vouch for this person, so there is no session.
 */
export function identityFromClaims(claims) {
  if (claims['mctl:refused'] !== undefined) return { ok: false, reason: 'refused' };
  const githubId = claims['mctl:github_id'];
  const login = claims['mctl:github_login'];
  if (typeof githubId !== 'string' || !GITHUB_ID_RE.test(githubId)) return { ok: false, reason: 'no_github_id' };
  if (typeof login !== 'string' || !GITHUB_LOGIN_RE.test(login)) return { ok: false, reason: 'no_github_id' };
  if (typeof claims.email !== 'string' || !claims.email.includes('@') || claims.email_verified !== true) {
    return { ok: false, reason: 'email_unverified' };
  }
  return {
    ok: true,
    identity: {
      sub: claims.sub,
      github_id: githubId,
      login,
      email: claims.email,
      name: typeof claims.name === 'string' ? claims.name : '',
    },
  };
}

// ─── Sessions (Workers KV) ───────────────────────────────────────────────────

const SESSION_VERSION = 1;

export async function createSession(kv, { identity, idToken, idTokenExp }, nowSeconds) {
  const exp = Math.min(nowSeconds + SESSION_MAX_SECONDS, idTokenExp);
  const sessionId = randomToken(32);
  const record = { v: SESSION_VERSION, ...identity, id_token: idToken, exp };
  // `expiration` is absolute, so KV drops the record at the same moment the
  // session ends, whatever the cookie says.
  await kv.put(await sessionKey(sessionId), JSON.stringify(record), { expiration: exp });
  return { sessionId, exp };
}

/**
 * The session named by the request's cookie, or `{ ok: false, reason }`:
 * `none` without a cookie, `invalid` for a malformed id or a missing,
 * unreadable or expired record. The caller clears the cookie on `invalid`.
 */
export async function loadSession(request, kv, nowSeconds) {
  const sessionId = readCookie(request, SESSION_COOKIE);
  if (!sessionId) return { ok: false, reason: 'none' };
  if (!SESSION_ID_RE.test(sessionId)) return { ok: false, reason: 'invalid' };
  const key = await sessionKey(sessionId);
  const raw = await kv.get(key);
  if (!raw) return { ok: false, reason: 'invalid' };
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (
    !record || record.v !== SESSION_VERSION ||
    typeof record.id_token !== 'string' ||
    typeof record.github_id !== 'string' ||
    !Number.isSafeInteger(record.exp) || record.exp <= nowSeconds
  ) {
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, key, session: record };
}

// ─── Sign-in: start ──────────────────────────────────────────────────────────

/**
 * GET /api/zitadel/login?redirect_to=<origin>
 *
 * Sends the browser to ZITADEL's authorize endpoint for the `customers` org
 * with its GitHub IdP preselected. state, nonce and the PKCE verifier ride
 * in a short-lived `__Host-` cookie. It is not signed, on purpose: only
 * mctl.ai itself over HTTPS can set a `__Host-` cookie, so whoever could
 * forge it could already run script on the site. A code injected from
 * another sign-in still fails, because the token exchange needs the
 * verifier that belongs to that code.
 */
export async function handleZitadelLogin(url, env, errorRedirect) {
  const cfg = zitadelConfig(env);
  const redirectTo = (url.searchParams.get('redirect_to') || '').replace(/\/$/, '');
  const returnTo = cfg.sessionOrigins.has(redirectTo) ? redirectTo : [...cfg.sessionOrigins][0];
  if (!zitadelConfigured(cfg)) {
    console.error('zitadel login: sign-in is not configured');
    return errorRedirect('NOT_CONFIGURED', returnTo);
  }

  const state = randomToken(16);
  const nonce = randomToken(16);
  const verifier = randomToken(32);
  const authorize = new URL(`${cfg.issuer}/oauth/v2/authorize`);
  authorize.searchParams.set('client_id', cfg.clientId);
  authorize.searchParams.set('redirect_uri', cfg.redirectUri);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', [
    'openid', 'profile', 'email',
    'urn:zitadel:iam:user:resourceowner',
    `urn:zitadel:iam:org:id:${cfg.orgId}`,
    `urn:zitadel:iam:org:idp:id:${cfg.idpId}`,
  ].join(' '));
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('nonce', nonce);
  authorize.searchParams.set('code_challenge', await pkceChallenge(verifier));
  authorize.searchParams.set('code_challenge_method', 'S256');

  const pending = base64url(new TextEncoder().encode(JSON.stringify({ s: state, n: nonce, v: verifier, o: returnTo })));
  const headers = new Headers({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' });
  headers.set('Location', authorize.toString());
  headers.append('Set-Cookie', hostCookie(LOGIN_COOKIE, pending, LOGIN_MAX_SECONDS));
  return new Response(null, { status: 302, headers });
}

// ─── Sign-in: callback ───────────────────────────────────────────────────────

/**
 * GET /api/zitadel/callback?code&state
 *
 * Exchanges the code, verifies the ID token and stores the session. Any
 * failure redirects back to the site with an error code and creates nothing.
 */
export async function handleZitadelCallback(url, request, env, errorRedirect, successRedirect, nowSeconds) {
  const cfg = zitadelConfig(env);
  const pending = decodeJsonSegment(readCookie(request, LOGIN_COOKIE) || '');
  const returnTo = pending && cfg.sessionOrigins.has(pending.o) ? pending.o : [...cfg.sessionOrigins][0];
  const fail = (code) => {
    const res = errorRedirect(code, returnTo);
    res.headers.append('Set-Cookie', clearLoginCookie());
    return res;
  };

  if (!zitadelConfigured(cfg)) return fail('NOT_CONFIGURED');
  if (url.searchParams.get('error')) return fail('ACCESS_DENIED');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return fail('MISSING_PARAMS');
  if (
    !pending || typeof pending.s !== 'string' || typeof pending.n !== 'string' ||
    typeof pending.v !== 'string' || !timingSafeEqualStrings(pending.s, state)
  ) {
    return fail('INVALID_STATE');
  }

  let idToken;
  try {
    const res = await fetch(`${cfg.issuer}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: cfg.redirectUri,
        client_id: cfg.clientId,
        code_verifier: pending.v,
      }),
    });
    if (!res.ok) {
      console.error(`zitadel callback: token endpoint answered ${res.status}`);
      return fail('TOKEN_EXCHANGE');
    }
    const body = await res.json();
    idToken = body && body.id_token;
  } catch (e) {
    console.error('zitadel callback: token exchange failed:', e?.message ?? e);
    return fail('TOKEN_EXCHANGE');
  }

  const verified = await verifyIdToken(idToken, cfg, { nonce: pending.n, nowSeconds });
  if (!verified.ok) {
    console.error(`zitadel callback: ID token refused (${verified.reason})`);
    return fail(verified.reason === 'jwks_unavailable' ? 'TOKEN_EXCHANGE' : 'TOKEN_INVALID');
  }
  const person = identityFromClaims(verified.claims);
  if (!person.ok) {
    console.warn(`zitadel callback: no session for sub ${verified.claims.sub} (${person.reason})`);
    return fail(person.reason === 'email_unverified' ? 'EMAIL_UNVERIFIED' : 'ACCOUNT_REFUSED');
  }
  if (verified.claims.exp - nowSeconds < MIN_SESSION_SECONDS) return fail('TOKEN_INVALID');

  let session;
  try {
    session = await createSession(cfg.sessions, {
      identity: person.identity, idToken, idTokenExp: verified.claims.exp,
    }, nowSeconds);
  } catch (e) {
    console.error('zitadel callback: session store failed:', e?.message ?? e);
    return fail('SESSION_STORE');
  }

  const res = successRedirect(returnTo);
  res.headers.append('Set-Cookie', hostCookie(SESSION_COOKIE, session.sessionId, session.exp - nowSeconds));
  res.headers.append('Set-Cookie', clearLoginCookie());
  return res;
}

// ─── Session and sign-out ────────────────────────────────────────────────────

/** The public part of a session: what the site may show. Never the token. */
export function sessionView(cfg, session) {
  return {
    signedIn: true,
    login: session.login,
    name: session.name,
    email: session.email,
    githubId: session.github_id,
    expiresAt: session.exp,
    canRequestWorkspace: mayUseCookieFlow(cfg, session),
  };
}

/**
 * The URL that ends the ZITADEL session too. Built with client_id rather
 * than id_token_hint, so the ID token stays on the server.
 */
export function endSessionUrl(cfg) {
  const url = new URL(`${cfg.issuer}/oidc/v1/end_session`);
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('post_logout_redirect_uri', cfg.postLogoutUri);
  return url.toString();
}
