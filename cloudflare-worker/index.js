import { handleSignupAdmin, invitationAllowed } from './signupAdmin.js';
/**
 * Cloudflare Worker for mctl.ai landing page
 * - GitHub OAuth (login + callback)
 * - Team availability check via Backstage tenant API
 * - Submit tenant provisioning workflow via Backstage API
 * - Telegram notifications + welcome emails
 *
 * Environment variables (set via wrangler secret):
 * - TELEGRAM_BOT_TOKEN: Telegram bot token
 * - TELEGRAM_CHAT_ID: Telegram chat ID
 * - GITHUB_CLIENT_ID: GitHub OAuth App client ID
 * - GITHUB_CLIENT_SECRET: GitHub OAuth App client secret
 * - GITHUB_OAUTH_HMAC_KEY: random 32+ char string for signing auth data (state
 *     cookie and the v2 identity, see signIdentity)
 * - BACKSTAGE_LANDING_TOKEN: Shared secret for signing landing-page JWT tokens (HMAC-SHA256).
 *     Must match the BACKSTAGE_LANDING_TOKEN env var in the Backstage pod.
 * - RESEND_API_KEY: Resend.com API key for sending welcome emails
 * - TURNSTILE_SECRET_KEY: Cloudflare Turnstile secret key, verified against
 *     https://challenges.cloudflare.com/turnstile/v0/siteverify for /api/contact
 *     and /api/submit. Public sitekey lives in the frontend build
 *     (NUXT_PUBLIC_TURNSTILE_SITE_KEY), not here.
 *
 * Config vars (set via wrangler.toml [vars] — not secret):
 * - UNLIMITED_USERS: comma-separated GitHub logins exempt from tenant-provisioning limits
 *
 * ZITADEL sign-in with server-side sessions (stage C1a) is in zitadel.js,
 * which lists its own config. Its routes run next to the legacy GitHub flow
 * above, which they do not change.
 */

import { handleInvitationRequest, retryInvitations } from './invitations.js';

import { handleSessionRevocation } from './sessionRevocation.js';

import {
  SESSION_COOKIE,
  clearSessionCookie,
  credentialCorsHeaders,
  clearLoginCookie,
  csrfOk,
  endSessionUrl,
  handleZitadelCallback,
  handleZitadelLogin,
  loadSession,
  mayUseCookieFlow,
  readCookie,
  sessionView,
  zitadelConfig,
  zitadelConfigured,
} from './zitadel.js';

const BASE_DOMAIN = 'mctl.ai';
// Subdomain redirects: *.mctl.me and *.mctl.ru → *.mctl.ai
// Root domain redirects (mctl.me, mctl.ru) are handled by CF Redirect Rules — no Worker invocation.
const REDIRECT_SUFFIXES = ['.mctl.me', '.mctl.ru'];
const ALLOWED_ORIGINS = new Set(['https://mctl.ai', 'http://localhost:3000']);

// Routes that read the __Host-mctl_sid cookie from a fetch. Only their
// preflight advertises credentials; the origins that may send the cookie are
// SESSION_ORIGINS (zitadel.js), which sets Allow-Origin itself.
const SESSION_COOKIE_PATHS = new Set([
  '/api/zitadel/session', '/api/zitadel/logout', '/api/team/check', '/api/submit',
]);
const LANDING_URL = `https://${BASE_DOMAIN}`;
const CALLBACK_URL = `https://${BASE_DOMAIN}/api/github/callback`;
const BACKSTAGE_APP_URL = 'https://app.mctl.ai';

// Rate limit: max requests per IP per window (seconds)
// Keyed by "METHOD path", not path alone, and matched against the method that
// actually routes below.
//
// A path-only key counts requests the worker never serves. Since CORS blocks
// *reading* a cross-origin response but not *sending* the request, a third-party
// page can drain a visitor's bucket with nothing but image tags:
// `<img src="https://mctl.ai/api/contact">` issues a GET, which no route
// handles, yet under a path-only key it decremented the same budget the real
// POST form spends. /api/contact allows 3 per 5 minutes, so three tags on any
// page the victim loads locked them out of the contact form — and the victim
// sees only a generic 429 from the legitimate site afterwards.
//
// With the method in the key, an unrouted method has its own budget that no
// real user spends, so exhausting it costs an attacker a 404 and nothing else.
const RATE_LIMITS = {
  'POST /api/submit':  { max: 5,  windowSec: 300 },
  'POST /api/access-requests': { max: 3, windowSec: 300 },
  'POST /api/contact': { max: 3,  windowSec: 300 },
  'GET /api/github/login': { max: 10, windowSec: 60 },
  'POST /api/github/check-team': { max: 20, windowSec: 60 },
  'GET /api/zitadel/login': { max: 10, windowSec: 60 },
  'POST /api/zitadel/logout': { max: 10, windowSec: 60 },
  // Generous: every callback from behind one NAT shares this counter, and a
  // forged one dies at INVALID_STATE before any outbound fetch.
  'GET /api/zitadel/callback': { max: 30, windowSec: 60 },
  'GET /api/zitadel/session': { max: 60, windowSec: 60 },
  'POST /api/team/check': { max: 20, windowSec: 60 },
  'POST /api/internal/customer-sessions/revoke': { max: 30, windowSec: 60 },
};

// Known bot User-Agent fragments — block before any processing.
// These scanners never represent real users and generate significant Worker invocations.
const BOT_UA_FRAGMENTS = [
  'zgrab', 'masscan', 'nuclei', 'sqlmap', 'nikto', 'nmap',
  'python-requests', 'go-http-client', 'curl/', 'wget/',
  'scrapy', 'dirbuster', 'gobuster', 'wfuzz', 'hydra',
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') || '';
    const host = url.hostname;

    // ── Early bot block by User-Agent (runs before anything else) ─────────
    // Only applies to redirect domains — mctl.ai API traffic is legitimate.
    const isRedirectDomain = REDIRECT_SUFFIXES.some(s => host.endsWith(s));
    if (isRedirectDomain) {
      const ua = (request.headers.get('User-Agent') || '').toLowerCase();
      if (BOT_UA_FRAGMENTS.some(f => ua.includes(f))) {
        return new Response('', { status: 410 });
      }
      // PHP path scan — belt-and-suspenders (WAF handles most; Worker catches the rest)
      if (path.includes('.php')) {
        return new Response('', { status: 410 });
      }
    }

    // ── Subdomain redirect: *.mctl.me and *.mctl.ru → *.mctl.ai ──────────
    // Root domain redirects are handled upstream by CF Redirect Rules.
    const redirectSuffix = REDIRECT_SUFFIXES.find(s => host.endsWith(s));
    if (redirectSuffix) {
      const sub = host.slice(0, -redirectSuffix.length);
      return Response.redirect(`https://${sub}.mctl.ai${url.pathname}${url.search}`, 301);
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...corsHeaders(origin),
          ...(path === '/api/access-requests' && zitadelConfig(env).sessionOrigins.has(origin)
            ? { 'Access-Control-Allow-Origin': origin } : {}),
          ...(SESSION_COOKIE_PATHS.has(url.pathname) ? credentialCorsHeaders(origin, zitadelConfig(env)) : {}),
        },
      });
    }

    // Rate limiting for sensitive endpoints. See RATE_LIMITS on why the method
    // is part of the lookup, and rateBucket below on why the initiator is part
    // of the counter key but not of the lookup.
    const rateKey = `${request.method} ${path}`;
    const limit = RATE_LIMITS[rateKey];
    if (limit) {
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const limited = await checkRateLimit(
        clientIP, rateBucket(rateKey, request), limit.max, limit.windowSec);
      if (limited && rateKey === 'GET /api/zitadel/callback') {
        // A top-level navigation: back to the site, like every other callback
        // failure, rather than a JSON body on a bare API URL.
        const res = zitadelErrorRedirect('RATE_LIMITED', [...zitadelConfig(env).sessionOrigins][0]);
        res.headers.append('Set-Cookie', clearLoginCookie());
        return res;
      }
      if (limited) {
        return jsonResponse(
          { error: 'Too many requests. Please try again later.' },
          429,
          { 'Retry-After': String(limit.windowSec) },
          origin,
        );
      }
    }

    if (path.startsWith('/api/internal/invitations/')) return handleSignupAdmin(request, env);

    if (request.method === 'POST' && path === '/api/internal/customer-sessions/revoke') {
      return handleSessionRevocation(request, env);
    }

    // GitHub OAuth: initiate login
    if (request.method === 'GET' && path === '/api/github/login') {
      return handleGitHubLogin(env, url, origin);
    }

    // GitHub OAuth: callback
    if (request.method === 'GET' && path === '/api/github/callback') {
      return handleGitHubCallback(url, request, env);
    }

    // Check team availability (proxies to Backstage tenant API).
    // Identity-gated (github_auth in the JSON body) — POST only, never GET
    // with query-string credentials. See handleCheckTeam.
    if (request.method === 'POST' && path === '/api/github/check-team') {
      return handleCheckTeam(request, env, origin);
    }

    // ZITADEL sign-in and its server-side session (stage C1a, zitadel.js)
    if (request.method === 'GET' && path === '/api/zitadel/login') {
      return handleZitadelLogin(url, env, zitadelErrorRedirect);
    }
    if (request.method === 'GET' && path === '/api/zitadel/callback') {
      return handleZitadelCallback(
        url, request, env, zitadelErrorRedirect, zitadelSuccessRedirect, Math.floor(Date.now() / 1000));
    }
    if (request.method === 'GET' && path === '/api/zitadel/session') {
      return handleSessionInfo(request, env, origin);
    }
    if (request.method === 'POST' && path === '/api/zitadel/logout') {
      return handleLogout(request, env, origin);
    }
    if (request.method === 'POST' && path === '/api/team/check') {
      return handleSessionCheckTeam(request, env, origin);
    }

    // Form submission. A session cookie selects the cookie branch, even when
    // the body also carries a legacy github_auth; an invalid cookie is a 401
    // there, never a fall back to the legacy identity.
    if (request.method === 'POST' && path === '/api/submit') {
      if (readCookie(request, SESSION_COOKIE) !== null) {
        return handleSessionSubmit(request, env, origin);
      }
      return handleFormSubmit(request, env, origin);
    }

    if (request.method === 'GET' && path === '/api/signup-status') {
      return jsonResponse({ invitationOnly: env.AUTH_FLOW_PUBLIC !== 'true' }, 200, { 'Cache-Control': 'no-store' }, origin);
    }
    if (request.method === 'POST' && path === '/api/access-requests') {
      return handleInvitationRequest(request, env, ctx, verifyTurnstileToken);
    }

    // Contact form submission
    if (request.method === 'POST' && path === '/api/contact') {
      return handleContactForm(request, env, origin);
    }

    return new Response('Not Found', { status: 404 });
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(retryInvitations(env));
  },
};

// ─── Rate Limiting (Cache API) ──────────────────────────────────────────────
// Simple per-IP rate limiter using Cloudflare Cache API.
// Not perfectly accurate (distributed, eventually consistent) but provides
// reasonable abuse protection without additional services (KV, D1).

// The only Sec-Fetch-Site values that may reach a cache key; everything else
// folds into 'cross-site'.
//
// Load-bearing, not tidiness. The header is unforgeable by *page script*, but
// any non-browser client sets it freely, so passing the raw value into the key
// would let a caller mint a fresh counter per request ("bypass-1", "bypass-2",
// ...) and take the rate limit off /api/submit and /api/contact entirely.
// Bounding the cardinality is what keeps the limiter a limiter.
const FETCH_SITE_CLASSES = new Set(['same-site', 'cross-site', 'none']);

// Splits the counter by who caused the request, so traffic a third-party page
// can make a visitor's browser send cannot spend the budget the visitor needs.
//
// Keying by method alone was not enough. A cross-origin form POST is a simple
// request — form-encoded, no preflight — so the browser sends it with the right
// method and it lands in the same bucket the real form uses. /api/contact
// allows 3 per 5 minutes, so an auto-submitting hidden form on any page the
// visitor loads used to cost them the contact form. The handler rejects the
// body, but rejection happens after the counter has already been spent.
//
// Sec-Fetch-Site carries this because page script can neither set nor strip it.
// That makes it honest about a browser-driven attack, which is the threat here.
// It says nothing about a direct client — see FETCH_SITE_CLASSES above.
//
// A missing header shares the site's own bucket, deliberately, with a known
// gap. Usually an absent header means a non-browser client (curl, uptime
// checks, older agents) calling from its own address, where exhausting a budget
// harms only itself. But "browsers always send it" would be too strong: privacy
// extensions, some in-app webviews and proxies strip Fetch Metadata, and real
// cross-site browser traffic from those clients does land in the visitor's own
// bucket, so the drain stays open for that class. Not a regression — they had
// no protection at all before — and there is no clean fix that does not also
// break legitimate header-less callers. Origin is a possible secondary signal
// for a later pass; tracked with the rest in #89's follow-ups.
function rateBucket(rateKey, request) {
  const site = request.headers.get('Sec-Fetch-Site');
  if (!site || site === 'same-origin') return rateKey;
  // Third-party-initiated traffic gets its own budget per initiator class.
  // Legitimate cross-site callers are still limited — just not out of the
  // same-origin allowance.
  const cls = FETCH_SITE_CLASSES.has(site) ? site : 'cross-site';
  return `${rateKey} [${cls}]`;
}

async function checkRateLimit(ip, bucket, maxRequests, windowSec) {
  const cache = caches.default;
  // Both parts are percent-encoded into one path segment each. The bucket now
  // carries a method and a space ("POST /api/submit"), and interpolating that
  // raw would leave the segment boundaries up to URL parsing rather than to us.
  const key = `https://rate-limit.internal/${encodeURIComponent(bucket)}/${encodeURIComponent(ip)}`;
  const cacheReq = new Request(key);

  const cached = await cache.match(cacheReq);
  let count = 1;
  if (cached) {
    count = parseInt(await cached.text(), 10) + 1;
  }

  // Store updated count with TTL = window
  const resp = new Response(String(count), {
    headers: { 'Cache-Control': `s-maxage=${windowSec}` },
  });
  await cache.put(cacheReq, resp);

  return count > maxRequests;
}

// ─── CORS ────────────────────────────────────────────────────────────────────

function corsHeaders(origin = '') {
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://mctl.ai';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-MCTL-Request',
    'Vary': 'Origin',
  };
}

function jsonResponse(body, status = 200, extraHeaders = {}, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export function landingSuccessLocation(baseUrl, encodedAuth) {
  return `${baseUrl}/#auth=${encodedAuth}`;
}

export function landingErrorLocation(baseUrl, errorCode) {
  return `${baseUrl}/#auth_error=${errorCode}`;
}

function redirectHeaders() {
  const headers = new Headers();
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Cache-Control', 'private, no-store');
  return headers;
}

// GitHub logins exempt from tenant-provisioning limits, configured via the
// UNLIMITED_USERS wrangler.toml var (comma-separated). The default preserves
// the previously hardcoded list only when the var is UNSET — an explicit
// empty string means "no unlimited users" and must not fall back.
export function getUnlimitedUsers(env) {
  const raw =
    env && env.UNLIMITED_USERS !== undefined ? env.UNLIMITED_USERS : 'mashkovd';
  return raw.split(',').map(u => u.trim()).filter(Boolean);
}

// ─── GitHub API helper ───────────────────────────────────────────────────────

function githubAPI(path, token, options = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'mctl-landing',
      'Accept': 'application/vnd.github+json',
      ...(options.headers || {}),
    },
  });
}

// ─── Backstage tenant API helper ─────────────────────────────────────────────

function backstageAPI(path, token, options = {}) {
  return fetch(`${BACKSTAGE_APP_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

// ─── JWT helpers ─────────────────────────────────────────────────────────────

const JWT_HEADER = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function createLandingJwt(secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: 'mctl-landing', iat: now, exp: now + 60 };
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const sigInput = `${JWT_HEADER}.${payloadB64}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sigBytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(sigInput)));
  const sigB64 = btoa(String.fromCharCode(...sigBytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${sigInput}.${sigB64}`;
}

// ─── HMAC helpers ────────────────────────────────────────────────────────────

export async function hmacSign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  // Strict validation: parseInt would accept groups like "1g" (stops at the
  // first invalid char), and parsing attacker-length input before any length
  // check wastes work — callers still re-check length against the expected
  // digest, this just refuses non-hex early.
  if (typeof hex !== 'string' || hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(byte)) return null;
    bytes[i] = byte;
  }
  return bytes;
}

// Constant-time byte comparison — no early exit on mismatch, so the
// runtime doesn't leak how many leading bytes matched. Both inputs must
// already be the same length; the caller handles the (non-secret) length
// check separately.
function timingSafeEqualBytes(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hmacVerify(data, signature, secret) {
  const expected = await hmacSign(data, secret);
  // Length check first is fine — signature length isn't secret — and doing
  // it before hexToBytes avoids parsing attacker-sized input.
  if (typeof signature !== 'string' || signature.length !== expected.length) {
    return false;
  }
  const expectedBytes = hexToBytes(expected);
  const providedBytes = hexToBytes(signature);
  if (!providedBytes) return false;
  return timingSafeEqualBytes(expectedBytes, providedBytes);
}

// ─── Signed GitHub identity (v2, mctl-web#133) ───────────────────────────────
//
// After GitHub sign-in the browser holds an identity object and sends it back
// in `github_auth` on /api/github/check-team and /api/submit. Until #133 the
// HMAC covered only `login` and never expired, so `email` and `name` were
// whatever the request body said (the welcome email went to that address) and
// a leaked {login, sig} pair worked forever.
//
// v2 signs every field the Worker acts on, plus an expiry, and the handlers
// use only the signed values. Display-only fields (avatar_url, html_url) ride
// along unsigned and are never trusted: html_url is rebuilt from the login.
// The canonical form is a JSON array in fixed order, so field boundaries are
// unambiguous and the encoding is deterministic.
// Not exported: the Workers runtime treats every named export of the main
// module as an entrypoint and refuses to start on a non-function one.
const IDENTITY_VERSION = 2;
const IDENTITY_TTL_SECONDS = 8 * 60 * 60;
const IDENTITY_DOMAIN = 'mctl-web:github-identity:v2';
const GITHUB_LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

function identityCanonical({ github_id, login, email, name, exp }) {
  return JSON.stringify([IDENTITY_DOMAIN, github_id, login, email, name, exp]);
}

export async function signIdentity({ github_id, login, email, name, avatar_url = '' }, secret, nowSeconds) {
  const exp = nowSeconds + IDENTITY_TTL_SECONDS;
  const signed = { github_id, login, email, name, exp };
  return {
    v: IDENTITY_VERSION,
    ...signed,
    avatar_url,
    html_url: `https://github.com/${login}`,
    sig: await hmacSign(identityCanonical(signed), secret),
  };
}

// Result codes, sent to the client in the 401 body where noted:
// - missing:      no github_auth, or no login/sig at all (401, no code)
// - auth_format:  anything but a well-formed v2 object, including every v1
//                 blob (401, code) — the client clears it and asks for a new
//                 sign-in
// - auth_invalid: a well-formed v2 object whose signature does not verify
// - auth_expired: a valid signature past `exp` (401, code)
// Signature is checked before expiry, so an unsigned `exp` cannot steer the
// answer.
export async function verifyIdentity(raw, secret, nowSeconds) {
  if (
    !raw || typeof raw !== 'object' || Array.isArray(raw) ||
    typeof raw.login !== 'string' || !raw.login ||
    typeof raw.sig !== 'string' || !raw.sig
  ) {
    return { ok: false, reason: 'missing' };
  }
  const { v, github_id, login, email, name, exp, sig } = raw;
  const wellFormed =
    v === IDENTITY_VERSION &&
    Number.isSafeInteger(github_id) && github_id > 0 &&
    GITHUB_LOGIN_RE.test(login) &&
    typeof email === 'string' && email.includes('@') &&
    typeof name === 'string' &&
    Number.isSafeInteger(exp);
  if (!wellFormed) {
    return { ok: false, reason: 'auth_format' };
  }
  const signed = { github_id, login, email, name, exp };
  if (!await hmacVerify(identityCanonical(signed), sig, secret)) {
    return { ok: false, reason: 'auth_invalid' };
  }
  if (exp <= nowSeconds) {
    return { ok: false, reason: 'auth_expired' };
  }
  return { ok: true, identity: signed };
}

// base64url over the UTF-8 bytes. btoa() alone throws on any character above
// U+00FF, so a GitHub display name in Cyrillic or CJK used to fail sign-in.
export function encodeIdentity(identity) {
  const bytes = new TextEncoder().encode(JSON.stringify(identity));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── GitHub OAuth: Login ─────────────────────────────────────────────────────

async function handleGitHubLogin(env, url, origin) {
  // Landing flow only: it carries identity and never a GitHub token. The
  // `for=` flows that handed a token to docs.mctl.ai (`docs`) and to MCP
  // connectors (`mcp`, `tg-mcp`) are gone, and any `for` value is ignored:
  // MCP clients sign in through api.mctl.ai's own OAuth (mctlhq/mctl-api#525).

  // Allow caller to specify where to redirect after auth (validated against allowlist)
  const redirectTo = url && url.searchParams.get('redirect_to');
  const normalizedRedirectTo = redirectTo ? redirectTo.replace(/\/$/, '') : '';
  const safeOrigin = ALLOWED_ORIGINS.has(normalizedRedirectTo) ? normalizedRedirectTo : LANDING_URL;

  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const stateSig = await hmacSign(state, env.GITHUB_OAUTH_HMAC_KEY);

  const scope = 'read:user user:email';

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  githubAuthUrl.searchParams.set('scope', scope);
  githubAuthUrl.searchParams.set('state', state);

  const headers = new Headers();
  headers.set('Location', githubAuthUrl.toString());
  headers.append('Set-Cookie', `__gh_state=${state}.${stateSig}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`);
  headers.append('Set-Cookie', `__gh_origin=${safeOrigin}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`);

  return new Response(null, { status: 302, headers });
}

// ─── GitHub OAuth: Callback ──────────────────────────────────────────────────

async function handleGitHubCallback(url, request, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Parse cookies early so we know where to redirect errors
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const ghOrigin = cookies['__gh_origin'] || '';
  const baseUrl = ghOrigin && ALLOWED_ORIGINS.has(ghOrigin) ? ghOrigin : LANDING_URL;

  if (error) return redirectWithError('ACCESS_DENIED', baseUrl);
  if (!code || !state) return redirectWithError('MISSING_PARAMS', baseUrl);

  // Validate state from cookie
  const stateCookie = cookies['__gh_state'];
  if (!stateCookie) return redirectWithError('INVALID_STATE', baseUrl);

  const [cookieState, cookieSig] = stateCookie.split('.');
  if (cookieState !== state || !await hmacVerify(cookieState, cookieSig, env.GITHUB_OAUTH_HMAC_KEY)) {
    return redirectWithError('INVALID_STATE', baseUrl);
  }

  // Exchange code for access token
  let accessToken;
  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'mctl-landing' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: CALLBACK_URL,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) return redirectWithError('TOKEN_EXCHANGE', baseUrl);
    accessToken = tokenData.access_token;
  } catch (e) {
    return redirectWithError('TOKEN_EXCHANGE', baseUrl);
  }

  // Fetch user profile and emails
  let user, emails;
  try {
    const [userRes, emailsRes] = await Promise.all([
      githubAPI('/user', accessToken),
      githubAPI('/user/emails', accessToken),
    ]);
    if (!userRes.ok || !emailsRes.ok) return redirectWithError('PROFILE_FETCH', baseUrl);
    user = await userRes.json();
    emails = await emailsRes.json();
  } catch (e) {
    return redirectWithError('PROFILE_FETCH', baseUrl);
  }

  if (
    !user || typeof user !== 'object' ||
    !Number.isSafeInteger(user.id) || user.id <= 0 ||
    typeof user.login !== 'string' || !GITHUB_LOGIN_RE.test(user.login) ||
    !Array.isArray(emails)
  ) {
    return redirectWithError('PROFILE_FETCH', baseUrl);
  }

  // Only the primary address GitHub reports as verified. The public profile
  // email (`user.email`) is whatever the person typed into their profile and
  // GitHub does not verify it, so it is never a fallback: with no verified
  // primary address, sign-in stops and the page says how to fix it.
  const primaryEmail = emails.find(e => e && e.primary === true && e.verified === true &&
      typeof e.email === 'string' && e.email.includes('@'));
  if (!primaryEmail) {
    return redirectWithError('EMAIL_UNVERIFIED', baseUrl);
  }

  const clearState = '__gh_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/';
  const clearOrigin = '__gh_origin=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/';

  // Identity only (no access_token). Delivered in the URL fragment so it
  // never reaches server logs or Referer headers. Query-string ?auth= is
  // intentionally not used.
  const userData = await signIdentity({
    github_id: user.id,
    login: user.login,
    email: primaryEmail.email,
    name: typeof user.name === 'string' ? user.name : '',
    avatar_url: typeof user.avatar_url === 'string' ? user.avatar_url : '',
  }, env.GITHUB_OAUTH_HMAC_KEY, Math.floor(Date.now() / 1000));

  const encoded = encodeIdentity(userData);

  const headers = redirectHeaders();
  headers.set('Location', landingSuccessLocation(baseUrl, encoded));
  headers.append('Set-Cookie', clearState);
  headers.append('Set-Cookie', clearOrigin);
  return new Response(null, { status: 302, headers });
}

function redirectWithError(errorCode, baseUrl = LANDING_URL) {
  const headers = redirectHeaders();
  headers.set('Location', landingErrorLocation(baseUrl, errorCode));
  headers.append('Set-Cookie', '__gh_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  headers.append('Set-Cookie', '__gh_origin=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');

  return new Response(null, { status: 302, headers });
}

function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(';').forEach(part => {
    const [key, ...rest] = part.trim().split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  });
  return cookies;
}

// ─── Check Team Availability ─────────────────────────────────────────────────
// Checks Backstage tenant API — the single source of truth for provisioned tenants.
//
// Identity-gated: POST { name, github_auth }, where github_auth is the signed
// v2 identity, verified by verifyIdentity exactly as handleFormSubmit does.
// A verified caller gets today's truthful available:true/false answer.
// Anyone else — missing, malformed, stale or wrongly signed github_auth —
// gets a single fixed 401 body, byte-identical regardless of the queried
// name, so anonymous tenant-name enumeration is not possible. Credentials
// must never travel in the query string (sig is a bearer credential) — only
// the POST body is read here.

// No `available` field: it is the same key a verified caller gets for a
// *taken* name, so echoing it here tells an unauthenticated client
// "that name is taken" whenever it reads `available` before checking the
// status code. The 401 says nothing about the name, and its body should
// not pretend otherwise.
const CHECK_TEAM_UNAUTHORIZED_BODY = { error: 'GitHub authentication required' };

// `code` is added only for auth_format / auth_expired, which depend on the
// identity sent and never on the queried name, so the body stays identical
// for every name.
function checkTeamUnauthorized(origin, reason) {
  const body = reason === 'auth_format' || reason === 'auth_expired'
    ? { ...CHECK_TEAM_UNAUTHORIZED_BODY, code: reason }
    : CHECK_TEAM_UNAUTHORIZED_BODY;
  return jsonResponse(body, 401, {}, origin);
}

export async function handleCheckTeam(request, env, origin) {
  // Parse defensively: an unparsable body, a non-object body, a missing
  // github_auth, or a github_auth missing login/sig must all reach the same
  // 401 below — never a thrown TypeError (which the runtime would turn into
  // an information-leaking 500).
  let body;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body || typeof body !== 'object') {
    body = {};
  }

  const auth = await verifyIdentity(
    body.github_auth, env.GITHUB_OAUTH_HMAC_KEY, Math.floor(Date.now() / 1000));
  if (!auth.ok) {
    return checkTeamUnauthorized(origin, auth.reason);
  }

  // ── Verified caller: today's truthful answer ─────────────────────────────
  const name = typeof body.name === 'string' ? body.name : '';
  if (!name) {
    return jsonResponse({ error: 'Missing team name' }, 400, {}, origin);
  }

  const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
  if (!teamNameRegex.test(name)) {
    return jsonResponse({ available: false, error: 'Invalid team name format' }, 400, {}, origin);
  }

  if (!env.BACKSTAGE_LANDING_TOKEN) {
    console.error('check-team: BACKSTAGE_LANDING_TOKEN is not set');
    return jsonResponse({ error: 'Server misconfiguration' }, 500, {}, origin);
  }

  try {
    const jwt = await createLandingJwt(env.BACKSTAGE_LANDING_TOKEN);
    const res = await backstageAPI(
      `/api/tenant-management/tenants/${encodeURIComponent(name)}`,
      jwt,
    );
    if (res.status === 404) {
      return jsonResponse({ available: true }, 200, {}, origin);
    }
    if (res.ok) {
      return jsonResponse({ available: false, message: 'Team name is already taken' }, 200, {}, origin);
    }
    const errBody = await res.text().catch(() => '');
    console.error(`check-team: Backstage returned ${res.status} for "${name}": ${errBody}`);
    return jsonResponse({ error: 'Failed to check team availability' }, 500, {}, origin);
  } catch (e) {
    console.error('check-team: unexpected error:', e?.message ?? e);
    return jsonResponse({ error: 'Failed to check team availability' }, 500, {}, origin);
  }
}

// ─── Turnstile verification ──────────────────────────────────────────────────

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Verifies a Turnstile token against Cloudflare's siteverify API. Never
// throws — every failure mode (missing secret, missing token, network error,
// Cloudflare-reported failure) resolves to { success: false, reason }.
// `fetchImpl` is injectable so tests can stub the network call.
export async function verifyTurnstileToken(token, secret, remoteip, fetchImpl = fetch) {
  if (!secret) return { success: false, reason: 'not_configured' };
  if (typeof token !== 'string' || !token) return { success: false, reason: 'missing_token' };

  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set('remoteip', remoteip);

  try {
    const res = await fetchImpl(TURNSTILE_VERIFY_URL, { method: 'POST', body });
    if (!res.ok) return { success: false, reason: 'network_error' };
    const data = await res.json();
    if (data && data.success) return { success: true, reason: null };
    const reason = (data && Array.isArray(data['error-codes']) && data['error-codes'][0]) || 'failed';
    return { success: false, reason };
  } catch (e) {
    return { success: false, reason: 'network_error' };
  }
}

// ─── Form Submit ─────────────────────────────────────────────────────────────

export async function handleFormSubmit(request, env, origin) {
  try {
    const data = await request.json();
    const { github_auth, team, usecase, turnstile_token } = data;

    // ── Validate GitHub auth (signed v2 identity) ───────────────────────────
    // Everything below uses only the signed fields; name/email/html_url in
    // the request body are ignored.
    const auth = await verifyIdentity(
      github_auth, env.GITHUB_OAUTH_HMAC_KEY, Math.floor(Date.now() / 1000));
    if (!auth.ok) {
      if (auth.reason === 'auth_invalid') {
        return jsonResponse({ success: false, message: 'Invalid authentication signature' }, 403, {}, origin);
      }
      if (auth.reason === 'auth_format' || auth.reason === 'auth_expired') {
        return jsonResponse({
          success: false,
          code: auth.reason,
          message: 'Your sign-in has expired. Sign in with GitHub again.',
        }, 401, {}, origin);
      }
      return jsonResponse({ success: false, message: 'GitHub authentication required' }, 401, {}, origin);
    }

    const { login, name, email } = auth.identity;

    if (!team) {
      return jsonResponse({ success: false, message: 'Missing team name' }, 400, {}, origin);
    }

    const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
    if (!teamNameRegex.test(team)) {
      return jsonResponse({ success: false, message: 'Invalid team name format' }, 400, {}, origin);
    }

    // ── Turnstile verification (fail closed) ────────────────────────────────
    if (!env.TURNSTILE_SECRET_KEY) {
      console.error('submit: TURNSTILE_SECRET_KEY is not set');
      return jsonResponse({ success: false, message: 'Server misconfiguration' }, 500, {}, origin);
    }
    const verification = await verifyTurnstileToken(
      turnstile_token,
      env.TURNSTILE_SECRET_KEY,
      request.headers.get('CF-Connecting-IP'),
    );
    if (!verification.success) {
      return jsonResponse({ success: false, message: 'Verification failed, please try again.' }, 400, {}, origin);
    }

    // ── Check if tenant already exists ─────────────────────────────────────
    const jwt = await createLandingJwt(env.BACKSTAGE_LANDING_TOKEN);
    if (!getUnlimitedUsers(env).includes(login)) {
      try {
        const existsRes = await backstageAPI(
          `/api/tenant-management/tenants/${encodeURIComponent(team)}`,
          jwt,
        );
        if (existsRes.ok) {
          return jsonResponse({
            success: false,
            message: `Team "${team}" is already provisioned on the platform.`,
          }, 409, {}, origin);
        }
      } catch (e) {
        console.warn('Tenant existence check failed, continuing:', e.message);
      }
    }

    // ── Submit tenant provisioning workflow ──────────────────────────────────
    let workflowSubmitted = false;
    let workflowName = null;
    let workflowError = null;
    try {
      const tenantRes = await backstageAPI(
        '/api/tenant-management/tenants',
        jwt,
        {
          method: 'POST',
          body: JSON.stringify({
            tenantName: team,
            displayName: team,
            description: usecase || '',
            contactEmail: email || '',
            creatorUserId: login,
          }),
        },
      );
      if (tenantRes.status === 202 || tenantRes.status === 200) {
        const tenantData = await tenantRes.json();
        workflowSubmitted = true;
        workflowName = tenantData.workflowName || null;
      } else {
        const err = await tenantRes.json().catch(() => ({}));
        workflowError = err.error || `Status ${tenantRes.status}`;
        console.error('Tenant API error:', workflowError);
      }
    } catch (e) {
      workflowError = e.message;
      console.error('Tenant API call failed:', e);
    }

    // Awaited here so a failure still reaches the catch below.
    return await finishSubmit(env, origin, {
      login, name, email, team, usecase, workflowSubmitted, workflowName, workflowError,
    });

  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ success: false, message: 'Failed to submit request. Please try again.' }, 500, {}, origin);
  }
}

// Notifications and the answer once the provisioning request went to the
// portal, shared by the legacy and the cookie branch of /api/submit.
// `extraHeaders` carries the cookie branch's credential CORS headers.
async function finishSubmit(env, origin, {
  login, name, email, team, usecase, workflowSubmitted, workflowName, workflowError, customer = false,
}, extraHeaders = {}) {
  const html_url = `https://github.com/${login}`;

  // ── Build Telegram notification ──────────────────────────────────────────
  const workflowStatus = workflowSubmitted
    ? `✅ Workflow submitted: \`${esc(workflowName || 'create-tenant')}\``
    : `❌ Workflow failed: ${esc(workflowError || 'unknown')}`;

  const msg = [
    `🚀 *mctl\\.ai — New Tenant Request*`,
    ``,
    `👤 [@${esc(login)}](${esc(html_url)})${name ? ` \\(${esc(name)}\\)` : ''}`,
    email ? `📧 ${esc(email)}` : null,
    `🏷 Team: \`${esc(team)}\``,
    ``,
    `*Status:*`,
    `• ${workflowStatus}`,
    usecase ? `📝 ${esc(usecase)}` : null,
    ``,
    `🔗 *Platform Access:*`,
    `• [Portal](https://app\\.mctl\\.ai/)`,
    `• [ArgoCD](https://ops\\.mctl\\.ai/)`,
    workflowSubmitted ? `• [Workflow](https://workflows\\.mctl\\.ai/)` : null,
    ``,
    `⏰ ${esc(new Date().toISOString())}`,
  ].filter(Boolean).join('\n');

  // The notifications are side effects of an already-submitted workflow.
  // Each one reports its own status and none may turn an accepted tenant
  // request into an error: before this, a Telegram network exception fell
  // through to the outer catch and answered 500 for a workspace that was
  // in fact being provisioned, inviting a duplicate request.
  const telegramStatus = await sendTelegram(env, msg);
  if (telegramStatus !== 'accepted') {
    console.error(`submit: Telegram notification ${telegramStatus} for team ${team}`);
  }

  // ── Response ─────────────────────────────────────────────────────────────
  if (workflowSubmitted) {
    const emailStatus = await sendWelcomeEmail(env, { email, name: name || login, team, customer });
    return jsonResponse({
      success: true,
      message: `Provisioning request for "${team}" accepted.`,
      emailStatus,
    }, 200, extraHeaders, origin);
  } else {
    return jsonResponse({
      success: false,
      message: 'Failed to submit provisioning request. Please try again.',
    }, 500, extraHeaders, origin);
  }
}

// ─── ZITADEL session routes (stage C1a) ──────────────────────────────────────
//
// The cookie branch. Sign-in itself is in zitadel.js; these routes read the
// session it stored and re-present its ID token to the portal on every
// request that acts, so mctl-api decides again each time.

const TEAM_NAME_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

// Back to the site with the new sign-in UI selected. Errors ride in the
// fragment, like the legacy flow's, so they never reach a server log.
export function zitadelErrorRedirect(errorCode, baseUrl = LANDING_URL) {
  const headers = redirectHeaders();
  headers.set('Location', `${baseUrl}/?auth_flow=zitadel#auth_error=${errorCode}`);
  return new Response(null, { status: 302, headers });
}

export function zitadelSuccessRedirect(baseUrl = LANDING_URL) {
  const headers = redirectHeaders();
  headers.set('Location', `${baseUrl}/?auth_flow=zitadel`);
  return new Response(null, { status: 302, headers });
}

// A JSON answer of the cookie branch: never cached, and readable with
// credentials by the site's own origins only.
function sessionJson(body, status, origin, cfg, extraHeaders = {}) {
  return jsonResponse(body, status, {
    'Cache-Control': 'private, no-store',
    ...credentialCorsHeaders(origin, cfg),
    ...extraHeaders,
  }, origin);
}

// GET /api/zitadel/session: who is signed in, for the site to show. Not a
// credential check for anything else, so it needs no CSRF header.
export async function handleSessionInfo(request, env, origin) {
  const cfg = zitadelConfig(env);
  if (!zitadelConfigured(cfg)) {
    return sessionJson({ error: 'Sign-in is not available' }, 503, origin, cfg);
  }
  let loaded;
  try {
    loaded = await loadSession(request, cfg.sessions, Math.floor(Date.now() / 1000));
  } catch (e) {
    console.error('session: KV read failed:', e?.message ?? e);
    return sessionJson({ error: 'Sign-in is not available' }, 503, origin, cfg);
  }
  if (!loaded.ok) {
    const clear = loaded.reason === 'invalid' ? { 'Set-Cookie': clearSessionCookie() } : {};
    return sessionJson({ signedIn: false }, 200, origin, cfg, clear);
  }
  try {
    const view = sessionView(cfg, loaded.session);
    if (!view.canRequestWorkspace) view.canRequestWorkspace = await invitationAllowed(env, loaded.session.github_id);
    return sessionJson(view, 200, origin, cfg);
  } catch { return sessionJson({ error: 'Invitation could not be verified' }, 503, origin, cfg); }
}

// POST /api/zitadel/logout: ends the session here and hands back the URL
// that ends the ZITADEL session as well.
export async function handleLogout(request, env, origin) {
  const cfg = zitadelConfig(env);
  if (!csrfOk(request, cfg)) {
    return sessionJson({ error: 'Forbidden', code: 'csrf' }, 403, origin, cfg);
  }
  if (!zitadelConfigured(cfg)) {
    return sessionJson({ error: 'Sign-in is not available' }, 503, origin, cfg);
  }
  try {
    const loaded = await loadSession(request, cfg.sessions, Math.floor(Date.now() / 1000));
    if (loaded.ok) await cfg.sessions.delete(loaded.key);
  } catch (e) {
    // The cookie is cleared regardless; a record left behind expires by
    // itself and is useless without the cookie.
    console.error('logout: KV delete failed:', e?.message ?? e);
  }
  return sessionJson(
    { signedIn: false, logoutUrl: endSessionUrl(cfg) }, 200, origin, cfg,
    { 'Set-Cookie': clearSessionCookie() },
  );
}

/**
 * The session behind a cookie-branch request, or the answer to send instead:
 * 403 csrf, 503 not configured, 401 session_required (clearing a stale
 * cookie), 403 not_in_test_group.
 */
async function requireSession(request, env, origin) {
  const cfg = zitadelConfig(env);
  if (!csrfOk(request, cfg)) {
    return { response: sessionJson({ error: 'Forbidden', code: 'csrf' }, 403, origin, cfg) };
  }
  if (!zitadelConfigured(cfg)) {
    return { response: sessionJson({ error: 'Sign-in is not available' }, 503, origin, cfg) };
  }
  let loaded;
  try {
    loaded = await loadSession(request, cfg.sessions, Math.floor(Date.now() / 1000));
  } catch (e) {
    console.error('session: KV read failed:', e?.message ?? e);
    return { response: sessionJson({ error: 'Sign-in is not available' }, 503, origin, cfg) };
  }
  if (!loaded.ok) {
    return {
      response: sessionJson(
        { error: 'Sign in again', code: 'session_required' }, 401, origin, cfg,
        { 'Set-Cookie': clearSessionCookie() },
      ),
    };
  }
  let admitted = mayUseCookieFlow(cfg, loaded.session);
  try { if (!admitted) admitted = await invitationAllowed(env, loaded.session.github_id); }
  catch { return { response: sessionJson({ error: 'Invitation could not be verified' }, 503, origin, cfg) }; }
  if (!admitted) {
    return {
      response: sessionJson(
        { error: 'Self-service workspaces are not open to this account yet', code: 'not_in_test_group' },
        403, origin, cfg,
      ),
    };
  }
  return { cfg, key: loaded.key, session: loaded.session };
}

// The portal refused the stored ID token (mctl-api answered about the
// customer: expired or invalid token, revoked identity, disabled
// principal). The session is over: forget it and ask for a new sign-in.
// The portal's 403 codes that are about the stored ID token or the person
// behind it (mctl-api's refusal of the creator). The session can no longer
// act, so these end it; a new sign-in either fixes the cause (an expired or
// unproven token) or meets the same refusal at the next request. Any other
// 403 is a server-side cause unrelated to the session: ending it would only
// loop the person through sign-in.
const IDENTITY_REFUSALS = new Set([
  'not_a_customer', 'id_token_invalid', 'customer_unproven',
  'principal_disabled', 'identity_refused', 'customer_conflict',
]);

// The portal's 403 code, or '' when the body has none. Logged at both call
// sites, so a code outside IDENTITY_REFUSALS (contract drift) is visible.
export async function refusalCode(res) {
  const body = await res.json().catch(() => ({}));
  return typeof body?.code === 'string' ? body.code : '';
}

async function revokedSession(ctx, origin) {
  try {
    await ctx.cfg.sessions.delete(ctx.key);
  } catch (e) {
    console.error('session: KV delete failed:', e?.message ?? e);
  }
  return sessionJson(
    { success: false, error: 'Sign in again', code: 'session_revoked' }, 401, origin, ctx.cfg,
    { 'Set-Cookie': clearSessionCookie() },
  );
}

async function readJsonObject(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
}

// POST /api/team/check {name}: whether this signed-in customer can create
// a workspace with that name. The portal answers from the ID token
// (POST /api/tenant-management/tenants/availability).
export async function handleSessionCheckTeam(request, env, origin) {
  const ctx = await requireSession(request, env, origin);
  if (ctx.response) return ctx.response;

  const body = await readJsonObject(request);
  const name = typeof body.name === 'string' ? body.name : '';
  if (!TEAM_NAME_RE.test(name)) {
    return sessionJson({ error: 'Invalid team name format' }, 400, origin, ctx.cfg);
  }
  if (!env.BACKSTAGE_LANDING_TOKEN) {
    console.error('team/check: BACKSTAGE_LANDING_TOKEN is not set');
    return sessionJson({ error: 'Server misconfiguration' }, 500, origin, ctx.cfg);
  }

  try {
    const jwt = await createLandingJwt(env.BACKSTAGE_LANDING_TOKEN);
    const res = await backstageAPI('/api/tenant-management/tenants/availability', jwt, {
      method: 'POST',
      body: JSON.stringify({ name, creatorIdToken: ctx.session.id_token }),
    });
    if (res.status === 403) {
      const code = await refusalCode(res);
      if (IDENTITY_REFUSALS.has(code)) {
        console.warn(`team/check: portal refused the session of GitHub id ${ctx.session.github_id}: ${code}`);
        return revokedSession(ctx, origin);
      }
      console.error(`team/check: portal answered 403 without an identity refusal (code "${code}")`);
      return sessionJson({ error: 'Failed to check team availability' }, 502, origin, ctx.cfg);
    }
    if (!res.ok) {
      console.error(`team/check: portal answered ${res.status}`);
      return sessionJson({ error: 'Failed to check team availability' }, 502, origin, ctx.cfg);
    }
    const answer = await res.json();
    if (!answer || typeof answer.available !== 'boolean') {
      console.error('team/check: portal answered without availability');
      return sessionJson({ error: 'Failed to check team availability' }, 502, origin, ctx.cfg);
    }
    return sessionJson(
      answer.available ? { available: true } : { available: false, reason: String(answer.reason || '') },
      200, origin, ctx.cfg,
    );
  } catch (e) {
    console.error('team/check: unexpected error:', e?.message ?? e);
    return sessionJson({ error: 'Failed to check team availability' }, 502, origin, ctx.cfg);
  }
}

// POST /api/submit with a session cookie {team, usecase, turnstile_token}.
// The creator is the signed-in customer, named by the ID token; the portal
// keeps one workspace per customer and answers 409 with a code otherwise.
export async function handleSessionSubmit(request, env, origin) {
  const ctx = await requireSession(request, env, origin);
  if (ctx.response) return ctx.response;
  const { cfg, session } = ctx;
  const credentials = { ...credentialCorsHeaders(origin, cfg), 'Cache-Control': 'private, no-store' };

  try {
    const { team, usecase, turnstile_token } = await readJsonObject(request);
    if (typeof team !== 'string' || !TEAM_NAME_RE.test(team)) {
      return sessionJson({ success: false, message: 'Invalid team name format' }, 400, origin, cfg);
    }
    const description = typeof usecase === 'string' ? usecase : '';

    if (!env.TURNSTILE_SECRET_KEY || !env.BACKSTAGE_LANDING_TOKEN) {
      console.error('submit (session): TURNSTILE_SECRET_KEY or BACKSTAGE_LANDING_TOKEN is not set');
      return sessionJson({ success: false, message: 'Server misconfiguration' }, 500, origin, cfg);
    }
    const verification = await verifyTurnstileToken(
      turnstile_token, env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP'));
    if (!verification.success) {
      return sessionJson({ success: false, message: 'Verification failed, please try again.' }, 400, origin, cfg);
    }

    const jwt = await createLandingJwt(env.BACKSTAGE_LANDING_TOKEN);
    let tenantRes;
    try {
      tenantRes = await backstageAPI('/api/tenant-management/tenants', jwt, {
        method: 'POST',
        body: JSON.stringify({
          tenantName: team,
          displayName: team,
          description,
          contactEmail: session.email,
          creatorIdToken: session.id_token,
        }),
      });
    } catch (e) {
      console.error('submit (session): tenant API call failed:', e?.message ?? e);
      return await finishSubmit(env, origin, {
        login: session.login, name: session.name, email: session.email, team, usecase: description, customer: true,
        workflowSubmitted: false, workflowName: null, workflowError: e?.message ?? 'network error',
      }, credentials);
    }

    if (tenantRes.status === 403) {
      const code = await refusalCode(tenantRes);
      if (IDENTITY_REFUSALS.has(code)) {
        console.warn(`submit (session): portal refused the session of GitHub id ${session.github_id}: ${code}`);
        return revokedSession(ctx, origin);
      }
      console.error(`submit (session): portal answered 403 without an identity refusal (code "${code}")`);
      return sessionJson({ success: false, message: 'Failed to submit request. Please try again.' }, 502, origin, cfg);
    }
    if (tenantRes.status === 409) {
      const err = await tenantRes.json().catch(() => ({}));
      const code = err.code === 'creator_has_tenant' ? 'creator_has_tenant' : 'name_taken';
      const message = code === 'creator_has_tenant'
        ? 'This account already has a workspace.'
        : `Team "${team}" is already taken.`;
      return sessionJson({ success: false, code, message }, 409, origin, cfg);
    }
    if (tenantRes.status === 503) {
      return sessionJson(
        { success: false, message: 'Workspace requests are unavailable right now. Please try again later.' },
        503, origin, cfg,
      );
    }

    let workflowSubmitted = false;
    let workflowName = null;
    let workflowError = null;
    if (tenantRes.status === 202 || tenantRes.status === 200) {
      const tenantData = await tenantRes.json().catch(() => ({}));
      workflowSubmitted = true;
      workflowName = tenantData.workflowName || null;
    } else {
      const err = await tenantRes.json().catch(() => ({}));
      workflowError = err.error || `Status ${tenantRes.status}`;
      console.error('submit (session): tenant API error:', workflowError);
    }
    return await finishSubmit(env, origin, {
      login: session.login, name: session.name, email: session.email, team, usecase: description, customer: true,
      workflowSubmitted, workflowName, workflowError,
    }, credentials);
  } catch (error) {
    console.error('submit (session): error:', error);
    return sessionJson({ success: false, message: 'Failed to submit request. Please try again.' }, 500, origin, cfg);
  }
}

// ─── Contact Form ────────────────────────────────────────────────────────────

export async function handleContactForm(request, env, origin) {
  try {
    const data = await request.json();
    const { name, email, message, turnstile_token } = data;

    // Basic validation
    if (!name || !email || !message) {
      return jsonResponse({ success: false, message: 'All fields are required' }, 400, {}, origin);
    }

    if (!email.includes('@') || email.length < 5) {
      return jsonResponse({ success: false, message: 'Invalid email address' }, 400, {}, origin);
    }

    if (message.length < 10) {
      return jsonResponse({ success: false, message: 'Message is too short' }, 400, {}, origin);
    }

    // ── Turnstile verification (fail closed) ────────────────────────────────
    if (!env.TURNSTILE_SECRET_KEY) {
      console.error('contact: TURNSTILE_SECRET_KEY is not set');
      return jsonResponse({ success: false, message: 'Server misconfiguration' }, 500, {}, origin);
    }
    const verification = await verifyTurnstileToken(
      turnstile_token,
      env.TURNSTILE_SECRET_KEY,
      request.headers.get('CF-Connecting-IP'),
    );
    if (!verification.success) {
      return jsonResponse({ success: false, message: 'Verification failed, please try again.' }, 400, {}, origin);
    }

    // Build Telegram message
    const msg = [
      `📬 *mctl\\.ai — Contact Form*`,
      ``,
      `👤 ${esc(name)}`,
      `📧 ${esc(email)}`,
      ``,
      `💬 *Message:*`,
      esc(message),
      ``,
      `⏰ ${esc(new Date().toISOString())}`,
    ].join('\n');

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: 'MarkdownV2',
      }),
    });

    if (!telegramRes.ok) {
      console.error('Telegram error:', await telegramRes.text());
      return jsonResponse({ success: false, message: 'Failed to send message. Please try again.' }, 500, {}, origin);
    }

    return jsonResponse({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
    }, 200, {}, origin);

  } catch (error) {
    console.error('Contact form error:', error);
    return jsonResponse({ success: false, message: 'Failed to send message. Please try again.' }, 500, {}, origin);
  }
}

// ─── Telegram MarkdownV2 escaping ────────────────────────────────────────────

function esc(text) {
  if (!text) return '';
  return String(text).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

// ─── Welcome Email via Resend ────────────────────────────────────────────────

function escHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Palette from mctl-design tokens, the same values zitadel-iac's branding.tf
// gives auth.mctl.ai: paper surface, ink text, terracottaDeep accent (the
// step that is AA on paper). Email clients ignore external CSS and most
// ignore <style>, so every rule is inline, and the font stack falls back to
// system fonts because Onest is not available in a mail client.
const EMAIL_COLORS = {
  paper: '#f1ede4',
  card: '#ffffff',
  ink: '#15181d',
  muted: '#5b6068',
  line: '#e2ddd2',
  accent: '#b83d28',
};
const EMAIL_FONT = "Onest,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const CONTACT_URL = 'https://mctl.ai/#contact';

// Pure: returns the subject, HTML and plain-text parts of the welcome email.
// Acceptance is separate from readiness. The customer follow-up is delivered
// by the portal's verified-readiness outbox, not by this request handler.
// Legacy signup keeps its existing sign-in notice; it has no ready outbox.
export function renderWelcomeEmail({ name, team, customer = false, year = new Date().getUTCFullYear() }) {
  const c = EMAIL_COLORS;
  const subject = `MCTL: request accepted for workspace "${team}"`;
  const nextStep = customer
    ? "We will email you when your workspace access has been verified. Provisioning runs in the background; you do not need to submit another request."
    : "Portal sign-in for self-service accounts is not available yet. If you have questions, contact us.";
  const greeting = name ? `Hi ${name},` : 'Hi,';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${c.paper};font-family:${EMAIL_FONT};color:${c.ink}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.paper};padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:${c.card};border:1px solid ${c.line};border-radius:12px">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid ${c.line}">
          <span style="font-size:20px;font-weight:700;letter-spacing:1px;color:${c.ink}"><span style="color:${c.accent}">M</span>CTL</span>
        </td></tr>
        <tr><td style="padding:28px 32px">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${c.ink}">${escHtml(greeting)}</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${c.ink}">
            Your request for workspace <strong>${escHtml(team)}</strong> was accepted. Provisioning has started.
          </p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${c.ink}">
            ${escHtml(nextStep)}
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background:${c.accent}">
            <a href="${CONTACT_URL}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px">Contact us</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid ${c.line}">
          <p style="margin:0;font-size:12px;line-height:1.5;color:${c.muted}">You received this email because a workspace was requested on mctl.ai with this address. &copy; ${year} MCTL</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    '',
    `Your request for workspace "${team}" was accepted. Provisioning has started.`,
    '',
    nextStep,
    CONTACT_URL,
    '',
    '--',
    'You received this email because a workspace was requested on mctl.ai with this address.',
    `(c) ${year} MCTL`,
  ].join('\n');

  return { subject, html, text };
}

// Delivery status of a side notification. "accepted" means the provider
// answered 2xx — not that the message was delivered. "failed" covers both a
// non-2xx answer and a network exception. "skipped" means nothing was sent
// (no recipient or no API key), which is distinct from a failure.
async function sendWelcomeEmail(env, { email, name, team, customer }, fetchImpl = fetch) {
  if (!email) return 'skipped';
  if (!env.RESEND_API_KEY) {
    console.error('Welcome email: RESEND_API_KEY is not set');
    return 'skipped';
  }
  const { subject, html, text } = renderWelcomeEmail({ name, team, customer });
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MCTL <noreply@mctl.ai>',
        to: [email],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Welcome email: Resend answered ${res.status}: ${body.slice(0, 500)}`);
      return 'failed';
    }
    return 'accepted';
  } catch (e) {
    console.error('Welcome email: request to Resend failed:', e);
    return 'failed';
  }
}

async function sendTelegram(env, text, fetchImpl = fetch) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.error('Telegram: bot token or chat id is not set');
    return 'skipped';
  }
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Telegram: answered ${res.status}: ${body.slice(0, 500)}`);
      return 'failed';
    }
    return 'accepted';
  } catch (e) {
    console.error('Telegram: request failed:', e);
    return 'failed';
  }
}
