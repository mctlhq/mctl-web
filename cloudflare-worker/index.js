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
 * - GITHUB_OAUTH_HMAC_KEY: random 32+ char string for signing auth data
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
 */

const BASE_DOMAIN = 'mctl.ai';
// Subdomain redirects: *.mctl.me and *.mctl.ru → *.mctl.ai
// Root domain redirects (mctl.me, mctl.ru) are handled by CF Redirect Rules — no Worker invocation.
const REDIRECT_SUFFIXES = ['.mctl.me', '.mctl.ru'];
const ALLOWED_ORIGINS = new Set(['https://mctl.ai', 'http://localhost:3000']);
// Origins allowed to redeem a one-time OAuth session (MCP connector pages).
const SESSION_ORIGINS = new Set([
  ...ALLOWED_ORIGINS,
  'https://docs.mctl.ai',
  'https://labs-mctl-telegram.mctl.ai',
]);
const LANDING_URL = `https://${BASE_DOMAIN}`;
const CALLBACK_URL = `https://${BASE_DOMAIN}/api/github/callback`;
const BACKSTAGE_APP_URL = 'https://app.mctl.ai';
const SESSION_COOKIE = '__gh_session';
const SESSION_TTL_SEC = 300;
const SESSION_ID_RE = /^[0-9a-f]{64}$/;

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
  'POST /api/contact': { max: 3,  windowSec: 300 },
  'GET /api/github/login': { max: 10, windowSec: 60 },
  'POST /api/github/session': { max: 20, windowSec: 60 },
  'POST /api/github/check-team': { max: 20, windowSec: 60 },
};

// Known bot User-Agent fragments — block before any processing.
// These scanners never represent real users and generate significant Worker invocations.
const BOT_UA_FRAGMENTS = [
  'zgrab', 'masscan', 'nuclei', 'sqlmap', 'nikto', 'nmap',
  'python-requests', 'go-http-client', 'curl/', 'wget/',
  'scrapy', 'dirbuster', 'gobuster', 'wfuzz', 'hydra',
];

export default {
  async fetch(request, env) {
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
      if (path === '/api/github/session') {
        return new Response(null, { status: 204, headers: sessionCorsHeaders(origin) });
      }
      return new Response(null, { headers: corsHeaders(origin) });
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
      if (limited) {
        return jsonResponse(
          { error: 'Too many requests. Please try again later.' },
          429,
          { 'Retry-After': String(limit.windowSec) },
          origin,
        );
      }
    }

    // GitHub OAuth: initiate login
    if (request.method === 'GET' && path === '/api/github/login') {
      return handleGitHubLogin(env, url, origin);
    }

    // GitHub OAuth: callback
    if (request.method === 'GET' && path === '/api/github/callback') {
      return handleGitHubCallback(url, request, env);
    }

    // GitHub OAuth: one-time session redeem (never put access_token in a URL)
    if (request.method === 'POST' && path === '/api/github/session') {
      return handleGitHubSession(request, env, origin);
    }

    // Check team availability (proxies to Backstage tenant API).
    // Identity-gated (github_auth in the JSON body) — POST only, never GET
    // with query-string credentials. See handleCheckTeam.
    if (request.method === 'POST' && path === '/api/github/check-team') {
      return handleCheckTeam(request, env, origin);
    }

    // Form submission
    if (request.method === 'POST' && path === '/api/submit') {
      return handleFormSubmit(request, env, origin);
    }

    // Contact form submission
    if (request.method === 'POST' && path === '/api/contact') {
      return handleContactForm(request, env, origin);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// ─── Rate Limiting (Cache API) ──────────────────────────────────────────────
// Simple per-IP rate limiter using Cloudflare Cache API.
// Not perfectly accurate (distributed, eventually consistent) but provides
// reasonable abuse protection without additional services (KV, D1).

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
// Sec-Fetch-Site is the right signal because it is a forbidden header name:
// page script cannot set or strip it, so a browser-driven request always
// carries an honest value.
//
// A missing header shares the site's own bucket, deliberately. Spending the
// *victim's* budget requires the victim's browser, and browsers always send
// this header — so an absent one means a non-browser client (curl, uptime
// checks, older agents) calling from its own address, where exhausting a
// budget harms only itself. Bucketing those separately would buy nothing and
// would break clients that predate the header.
function rateBucket(rateKey, request) {
  const site = request.headers.get('Sec-Fetch-Site');
  if (!site || site === 'same-origin') return rateKey;
  // Third-party-initiated traffic gets its own budget per initiator class.
  // Legitimate cross-site callers (docs.mctl.ai redeeming a session, for
  // example) are still limited — just not out of the same-origin allowance.
  return `${rateKey} [${site}]`;
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
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(body, status = 200, extraHeaders = {}, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function sessionCorsHeaders(origin = '') {
  const allowedOrigin = SESSION_ORIGINS.has(origin) ? origin : 'https://mctl.ai';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function sessionJsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...sessionCorsHeaders(origin),
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
    },
  });
}

export function isSessionId(value) {
  return typeof value === 'string' && SESSION_ID_RE.test(value);
}

export function newSessionId() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function landingSuccessLocation(baseUrl, encodedAuth) {
  return `${baseUrl}/#auth=${encodedAuth}`;
}

export function landingErrorLocation(baseUrl, errorCode) {
  return `${baseUrl}/#auth_error=${errorCode}`;
}

export function fragmentSuccessLocation(target, sessionId) {
  return `${target}#session=${sessionId}`;
}

export function fragmentErrorLocation(target, errorCode) {
  return `${target}#auth_error=${errorCode}`;
}

function sessionCacheRequest(id) {
  return new Request(`https://oauth-session.internal/${id}`);
}

export async function putOAuthSession(id, payload, ttlSec = SESSION_TTL_SEC) {
  const cache = caches.default;
  await cache.put(sessionCacheRequest(id), new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `s-maxage=${ttlSec}`,
    },
  }));
}

export function sessionIsLive(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (typeof payload.exp === 'number' && Date.now() > payload.exp) return false;
  return true;
}

// Cookie is only a pointer to the one-time cache entry. Decrypt success
// alone must not return the GitHub token; the cache consume must hit.
export function redeemFromCookie(decrypted, consumed) {
  if (!sessionIsLive(decrypted) || !sessionIsLive(consumed)) return null;
  return consumed;
}

// Explicit allowlist for what `/api/github/session` returns to the browser.
// `token` is on this list deliberately: it is the credential
// docs.mctl.ai/mcp/connecting hands the user for api.mctl.ai/mcp, not an
// incidental leak. It is absent from tg-mcp payloads (see
// handleGitHubCallback), so those responses carry no token. Removing it from
// here entirely requires mctl-api to issue its own scoped token first — see
// mctlhq/mctl-api#218. Any other field on the internal session payload
// (e.g. sessionId, exp) is intentionally never exposed unless added here.
const SESSION_RESPONSE_FIELDS = ['login', 'name', 'avatar_url', 'html_url', 'sig', 'token'];

export function buildSessionResponsePayload(payload) {
  const out = {};
  for (const key of SESSION_RESPONSE_FIELDS) {
    if (key in payload) out[key] = payload[key];
  }
  return out;
}

export async function takeOAuthSession(id) {
  if (!isSessionId(id)) return null;
  const cache = caches.default;
  const req = sessionCacheRequest(id);
  const hit = await cache.match(req);
  if (!hit) return null;
  await cache.delete(req);
  try {
    return await hit.json();
  } catch {
    return null;
  }
}

function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(value) {
  const pad = '='.repeat((4 - (value.length % 4)) % 4);
  const bin = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function aesKeyFromSecret(secret) {
  // Domain-separate AES key material from HMAC signing of the same root secret.
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`mctl-oauth-session-v1:${secret}`),
  );
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptSessionPayload(payload, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKeyFromSecret(secret);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  ));
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv, 0);
  packed.set(ciphertext, iv.length);
  return bytesToB64url(packed);
}

export async function decryptSessionPayload(token, secret) {
  try {
    const packed = b64urlToBytes(token);
    if (packed.length < 13) return null;
    const iv = packed.slice(0, 12);
    const ciphertext = packed.slice(12);
    const key = await aesKeyFromSecret(secret);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

function sessionCookieHeader(value, maxAge, withDomain) {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    'Path=/',
  ];
  if (withDomain) parts.push('Domain=.mctl.ai');
  return parts.join('; ');
}

function appendClearSessionCookies(headers) {
  headers.append('Set-Cookie', sessionCookieHeader('', 0, false));
  headers.append('Set-Cookie', sessionCookieHeader('', 0, true));
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

// ─── GitHub OAuth: Login ─────────────────────────────────────────────────────

async function handleGitHubLogin(env, url, origin) {
  const flowParam = url && url.searchParams.get('for');
  // Flows that bypass the landing redirect and instead hand the caller a
  // one-time session (HttpOnly cookie + opaque #session= id). `tg-mcp` is
  // the Telegram MCP server at labs-mctl-telegram.mctl.ai (mctlhq/mctl-telegram).
  const fragmentFlows = new Set(['mcp', 'docs', 'tg-mcp']);
  const forDocs = fragmentFlows.has(flowParam);

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
  if (forDocs) {
    // Cookie value carries which fragment-flow we're in so the callback knows
    // which downstream URL to redirect to.
    headers.append('Set-Cookie', `__gh_flow=${flowParam}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`);
  }
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
  const ghFlow = cookies['__gh_flow'] || '';
  const ghOrigin = cookies['__gh_origin'] || '';
  const baseUrl = ghOrigin && ALLOWED_ORIGINS.has(ghOrigin) ? ghOrigin : LANDING_URL;

  if (error) return redirectWithError('ACCESS_DENIED', ghFlow, baseUrl);
  if (!code || !state) return redirectWithError('MISSING_PARAMS', ghFlow, baseUrl);

  // Validate state from cookie
  const stateCookie = cookies['__gh_state'];
  if (!stateCookie) return redirectWithError('INVALID_STATE', ghFlow, baseUrl);

  const [cookieState, cookieSig] = stateCookie.split('.');
  if (cookieState !== state || !await hmacVerify(cookieState, cookieSig, env.GITHUB_OAUTH_HMAC_KEY)) {
    return redirectWithError('INVALID_STATE', ghFlow, baseUrl);
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
    if (tokenData.error) return redirectWithError('TOKEN_EXCHANGE', ghFlow, baseUrl);
    accessToken = tokenData.access_token;
  } catch (e) {
    return redirectWithError('TOKEN_EXCHANGE', ghFlow, baseUrl);
  }

  // Fetch user profile and emails
  let user, emails;
  try {
    const [userRes, emailsRes] = await Promise.all([
      githubAPI('/user', accessToken),
      githubAPI('/user/emails', accessToken),
    ]);
    if (!userRes.ok || !emailsRes.ok) return redirectWithError('PROFILE_FETCH', ghFlow, baseUrl);
    user = await userRes.json();
    emails = await emailsRes.json();
  } catch (e) {
    return redirectWithError('PROFILE_FETCH', ghFlow, baseUrl);
  }

  const primaryEmail = emails.find(e => e.primary && e.verified);
  const email = primaryEmail ? primaryEmail.email : (user.email || '');

  const clearState = '__gh_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/';
  const clearFlow  = '__gh_flow=;  HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/';
  const clearOrigin = '__gh_origin=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/';

  const sig = await hmacSign(user.login, env.GITHUB_OAUTH_HMAC_KEY);

  // ── Fragment-redirect flows ─────────────────────────────────────────
  // Never put access_token in a URL (query or fragment). Store the payload
  // server-side and in an encrypted HttpOnly cookie; the redirect only
  // carries a one-time opaque session id in the fragment.
  const fragmentTargets = {
    docs:     'https://docs.mctl.ai/mcp/connecting',
    'mcp':    'https://docs.mctl.ai/mcp/connecting',
    'tg-mcp': 'https://labs-mctl-telegram.mctl.ai/telegram/connect',
  };
  if (fragmentTargets[ghFlow]) {
    const sessionId = newSessionId();
    const mcpPayload = {
      login:      user.login,
      name:       user.name || '',
      avatar_url: user.avatar_url || '',
      html_url:   user.html_url || '',
      sig,
      sessionId,
      exp: Date.now() + SESSION_TTL_SEC * 1000,
    };
    // `token` is only handed to flows that actually consume it.
    // docs.mctl.ai/mcp/connecting requires it as the api.mctl.ai/mcp bearer;
    // tg-mcp never calls /api/github/session, so it never gets one — the
    // token then never reaches the Cache API entry or the encrypted cookie
    // for that flow either. See mctlhq/mctl-api#218 for the follow-up that
    // replaces this GitHub token with a scoped, revocable mctl-issued one.
    if (ghFlow === 'docs' || ghFlow === 'mcp') {
      mcpPayload.token = accessToken;
    }
    await putOAuthSession(sessionId, mcpPayload);
    const encrypted = await encryptSessionPayload(mcpPayload, env.GITHUB_OAUTH_HMAC_KEY);

    const headers = redirectHeaders();
    headers.set('Location', fragmentSuccessLocation(fragmentTargets[ghFlow], sessionId));
    headers.append('Set-Cookie', clearState);
    headers.append('Set-Cookie', clearFlow);
    headers.append('Set-Cookie', clearOrigin);
    headers.append('Set-Cookie', sessionCookieHeader(encrypted, SESSION_TTL_SEC, true));
    return new Response(null, { status: 302, headers });
  }

  // ── Normal landing flow ──────────────────────────────────────────────────
  // Identity only (no access_token). Delivered in the URL fragment so it
  // never reaches server logs or Referer headers. Query-string ?auth= is
  // intentionally not used.
  const userData = {
    login: user.login,
    name: user.name || '',
    email,
    avatar_url: user.avatar_url || '',
    html_url: user.html_url || '',
    sig,
  };

  const encoded = btoa(JSON.stringify(userData))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const headers = redirectHeaders();
  headers.set('Location', landingSuccessLocation(baseUrl, encoded));
  headers.append('Set-Cookie', clearState);
  headers.append('Set-Cookie', clearFlow);
  headers.append('Set-Cookie', clearOrigin);
  return new Response(null, { status: 302, headers });
}

// Fragment-flow error targets must match the success-flow `fragmentTargets`
// map in handleGitHubCallback — otherwise OAuth failures send the user to the
// landing page instead of the page that initiated the flow (regression caught
// by Codex on PR #14: `?for=tg-mcp` ACCESS_DENIED was leaking back to landing).
const FRAGMENT_ERROR_TARGETS = {
  docs:     'https://docs.mctl.ai/mcp/connecting',
  'mcp':    'https://docs.mctl.ai/mcp/connecting',
  'tg-mcp': 'https://labs-mctl-telegram.mctl.ai/telegram/connect',
};

function redirectWithError(errorCode, flow = '', baseUrl = LANDING_URL) {
  const fragmentBase = FRAGMENT_ERROR_TARGETS[flow];
  const location = fragmentBase
    ? fragmentErrorLocation(fragmentBase, errorCode)
    : landingErrorLocation(baseUrl, errorCode);

  const headers = redirectHeaders();
  headers.set('Location', location);
  headers.append('Set-Cookie', '__gh_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  headers.append('Set-Cookie', '__gh_flow=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  headers.append('Set-Cookie', '__gh_origin=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  appendClearSessionCookies(headers);

  return new Response(null, { status: 302, headers });
}

async function handleGitHubSession(request, env, origin) {
  if (!SESSION_ORIGINS.has(origin)) {
    return sessionJsonResponse({ error: 'Origin not allowed' }, 403, origin);
  }

  let body = {};
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
  }

  let payload = null;
  if (isSessionId(body.code)) {
    const consumed = await takeOAuthSession(body.code);
    if (sessionIsLive(consumed)) payload = consumed;
  }

  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const cookieVal = cookies[SESSION_COOKIE] || '';
  if (!payload && cookieVal) {
    const decrypted = await decryptSessionPayload(cookieVal, env.GITHUB_OAUTH_HMAC_KEY);
    let consumed = null;
    if (decrypted && isSessionId(decrypted.sessionId)) {
      consumed = await takeOAuthSession(decrypted.sessionId);
    }
    payload = redeemFromCookie(decrypted, consumed);
  }

  const headers = new Headers(sessionCorsHeaders(origin));
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'private, no-store');
  appendClearSessionCookies(headers);

  if (!sessionIsLive(payload)) {
    return new Response(JSON.stringify({ error: 'Session expired or missing' }), {
      status: 401,
      headers,
    });
  }

  return new Response(JSON.stringify(buildSessionResponsePayload(payload)), { status: 200, headers });
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
// Identity-gated: POST { name, github_auth: { login, sig } }, verified the same
// way handleFormSubmit verifies github_auth. A verified caller gets today's
// truthful available:true/false answer. Anyone else — missing github_auth,
// malformed github_auth, or a signature that fails hmacVerify — gets a single
// fixed 401 body, byte-identical regardless of the queried name, so anonymous
// tenant-name enumeration is no longer possible. Credentials must never travel
// in the query string (sig is an unbounded bearer — see hmacSign/hmacVerify
// comments) — only the POST body is read here.

// No `available` field: it is the same key a verified caller gets for a
// *taken* name, so echoing it here tells an unauthenticated client
// "that name is taken" whenever it reads `available` before checking the
// status code. The 401 says nothing about the name, and its body should
// not pretend otherwise.
const CHECK_TEAM_UNAUTHORIZED_BODY = { error: 'GitHub authentication required' };

function checkTeamUnauthorized(origin) {
  return jsonResponse(CHECK_TEAM_UNAUTHORIZED_BODY, 401, {}, origin);
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

  const githubAuth = body.github_auth;
  const hasAuthShape =
    githubAuth &&
    typeof githubAuth === 'object' &&
    typeof githubAuth.login === 'string' &&
    githubAuth.login &&
    typeof githubAuth.sig === 'string' &&
    githubAuth.sig;

  if (!hasAuthShape) {
    return checkTeamUnauthorized(origin);
  }

  const validSig = await hmacVerify(githubAuth.login, githubAuth.sig, env.GITHUB_OAUTH_HMAC_KEY);
  if (!validSig) {
    return checkTeamUnauthorized(origin);
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

    // ── Validate GitHub auth (HMAC signature) ───────────────────────────────
    if (!github_auth || !github_auth.login || !github_auth.sig) {
      return jsonResponse({ success: false, message: 'GitHub authentication required' }, 401, {}, origin);
    }

    const validSig = await hmacVerify(github_auth.login, github_auth.sig, env.GITHUB_OAUTH_HMAC_KEY);
    if (!validSig) {
      return jsonResponse({ success: false, message: 'Invalid authentication signature' }, 403, {}, origin);
    }

    const { login, name, email, html_url } = github_auth;

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

    // ── Build Telegram notification ──────────────────────────────────────────
    const workflowStatus = workflowSubmitted
      ? `✅ Workflow submitted: \`${esc(workflowName || 'create-tenant')}\``
      : `❌ Workflow failed: ${esc(workflowError || 'unknown')}`;

    const msg = [
      `🚀 *mctl\\.me — New Tenant Request*`,
      ``,
      `👤 [@${esc(login)}](${esc(html_url)})${name ? ` \\(${esc(name)}\\)` : ''}`,
      email ? `📧 ${esc(email)}` : null,
      `🏷 Team: \`${esc(team)}\``,
      ``,
      `*Status:*`,
      `• ${esc(workflowStatus)}`,
      usecase ? `📝 ${esc(usecase)}` : null,
      ``,
      `🔗 *Platform Access:*`,
      `• [Portal](https://app\\.mctl\\.me/)`,
      `• [ArgoCD](https://ops\\.mctl\\.me/)`,
      workflowSubmitted ? `• [Workflow](https://workflows\\.mctl\\.me/)` : null,
      ``,
      `⏰ ${new Date().toISOString().replace(/[-.]/g, '\\$&')}`,
    ].filter(Boolean).join('\n');

    const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });

    // ── Send welcome email ───────────────────────────────────────────────────
    if (workflowSubmitted && email) {
      try {
        await sendWelcomeEmail(env, { email, name: name || login, team, login, workflowSubmitted });
      } catch (e) {
        console.error('Welcome email error:', e);
      }
    }

    // ── Response ─────────────────────────────────────────────────────────────
    if (workflowSubmitted) {
      return jsonResponse({
        success: true,
        message: `Team "${team}" is being provisioned! Sign in to app.mctl.ai with your GitHub account — your workspace will be ready in ~2 minutes.`,
      }, 200, {}, origin);
    } else {
      return jsonResponse({
        success: false,
        message: `Failed to submit provisioning request: ${workflowError}`,
      }, 500, {}, origin);
    }

  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ success: false, message: 'Failed to submit request. Please try again.' }, 500, {}, origin);
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
      `📬 *mctl\\.me — Contact Form*`,
      ``,
      `👤 ${esc(name)}`,
      `📧 ${esc(email)}`,
      ``,
      `💬 *Message:*`,
      esc(message),
      ``,
      `⏰ ${new Date().toISOString().replace(/[-.]/g, '\\$&')}`,
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

async function sendWelcomeEmail(env, { email, name, team, login, workflowSubmitted }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0e14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e14;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111820;border:1px solid rgba(0,245,255,0.2);border-radius:12px;overflow:hidden">

        <!-- Header -->
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid rgba(0,245,255,0.1)">
          <span style="font-size:24px;font-weight:700;letter-spacing:1px">
            <span style="color:#00f5ff">M</span><span style="color:#ffffff">CTL</span>
          </span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 40px">
          <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px">Welcome, ${escHtml(name)}!</h1>
          <p style="color:#8b949e;font-size:15px;line-height:1.6;margin:0 0 28px">
            Your team <strong style="color:#00f5ff">${escHtml(team)}</strong> has been created${workflowSubmitted ? ' and your Kubernetes namespace is being provisioned' : ''}. Follow these steps to get started:
          </p>

          <!-- Step 1 -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%">
            <tr>
              <td width="36" valign="top">
                <div style="width:28px;height:28px;border-radius:50%;background:#00f5ff;color:#0a0e14;font-weight:700;font-size:14px;line-height:28px;text-align:center">1</div>
              </td>
              <td style="padding-left:12px">
                <p style="color:#ffffff;font-size:15px;margin:0 0 4px;line-height:1.5">
                  <strong>Wait for namespace provisioning</strong> (~2 min)
                </p>
                <p style="color:#8b949e;font-size:13px;margin:0;line-height:1.5">
                  ArgoCD will automatically provision your Kubernetes namespace, resource quotas, and network policies.
                </p>
              </td>
            </tr>
          </table>

          <!-- Step 2 -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%">
            <tr>
              <td width="36" valign="top">
                <div style="width:28px;height:28px;border-radius:50%;background:#00f5ff;color:#0a0e14;font-weight:700;font-size:14px;line-height:28px;text-align:center">2</div>
              </td>
              <td style="padding-left:12px">
                <p style="color:#ffffff;font-size:15px;margin:0 0 12px;line-height:1.5">
                  <strong>Sign in with your GitHub account</strong> to access:
                </p>
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="padding-right:10px">
                    <a href="https://app.mctl.ai/" style="display:inline-block;padding:10px 20px;border:1px solid #00f5ff;color:#00f5ff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px">
                      Portal — app.mctl.ai
                    </a>
                  </td>
                  <td>
                    <a href="https://ops.mctl.ai/" style="display:inline-block;padding:10px 20px;border:1px solid #00f5ff;color:#00f5ff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px">
                      ArgoCD — ops.mctl.ai
                    </a>
                  </td>
                </tr></table>
              </td>
            </tr>
          </table>

          <div style="border-top:1px solid rgba(0,245,255,0.1);padding-top:20px">
            <p style="color:#8b949e;font-size:13px;margin:0;line-height:1.5">
              Questions? Reply to this email or reach us at
              <a href="https://mctl.ai/#contact" style="color:#00f5ff;text-decoration:none">mctl.ai/contact</a>
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(0,245,255,0.1)">
          <p style="color:#484f58;font-size:12px;margin:0">© 2025 MCTL. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MCTL <noreply@mctl.ai>',
      to: [email],
      subject: `Your team "${team}" is being provisioned — sign in to get started`,
      html,
    }),
  });
}
