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
 */

// All org-specific values are read from Worker env bindings (wrangler.toml [vars] or dashboard).
// This allows forks to configure their own domain, org, and Backstage URL without code changes.
function getConfig(env) {
  const baseDomain = env.BASE_DOMAIN || 'mctl.ai';
  return {
    baseDomain,
    redirectSuffixes: ['.mctl.me', '.mctl.ru'],
    redirectRoots: new Set(['mctl.me', 'mctl.ru']),
    allowedOrigins: new Set([`https://${baseDomain}`]),
    landingUrl: `https://${baseDomain}`,
    callbackUrl: `https://${baseDomain}/api/github/callback`,
    githubOrg: env.GITHUB_ORG || 'mctlhq',
    backstageAppUrl: env.BACKSTAGE_APP_URL || `https://app.${baseDomain}`,
    unlimitedUsers: (env.UNLIMITED_USERS || '').split(',').map(s => s.trim()).filter(Boolean),
  };
}

// Rate limit: max requests per IP per window (seconds)
const RATE_LIMITS = {
  '/api/submit':  { max: 5,  windowSec: 300 },  // 5 per 5 min
  '/api/contact': { max: 3,  windowSec: 300 },  // 3 per 5 min
  '/api/github/login': { max: 10, windowSec: 60 }, // 10 per min
};

export default {
  async fetch(request, env) {
    const cfg = getConfig(env);
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') || '';

    // ── Redirect *.mctl.me and *.mctl.ru to *.mctl.ai ────────────────────
    // Root: mctl.me → mctl.ai, mctl.ru → mctl.ai
    // Subdomains: app.mctl.me → app.mctl.ai, ops.mctl.me → ops.mctl.ai, etc.
    const host = url.hostname;
    if (cfg.redirectRoots.has(host)) {
      return Response.redirect(`https://${cfg.baseDomain}${url.pathname}${url.search}`, 301);
    }
    const redirectSuffix = cfg.redirectSuffixes.find(s => host.endsWith(s));
    if (redirectSuffix) {
      const sub = host.slice(0, -redirectSuffix.length);
      return Response.redirect(`https://${sub}.${cfg.baseDomain}${url.pathname}${url.search}`, 301);
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(cfg, origin) });
    }

    // Rate limiting for sensitive endpoints
    const limit = RATE_LIMITS[path];
    if (limit) {
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const limited = await checkRateLimit(clientIP, path, limit.max, limit.windowSec);
      if (limited) {
        return jsonResponse(
          { error: 'Too many requests. Please try again later.' },
          429,
          { 'Retry-After': String(limit.windowSec) },
          cfg,
          origin,
        );
      }
    }

    // GitHub OAuth: initiate login
    if (request.method === 'GET' && path === '/api/github/login') {
      return handleGitHubLogin(cfg, env, url, origin);
    }

    // GitHub OAuth: callback
    if (request.method === 'GET' && path === '/api/github/callback') {
      return handleGitHubCallback(cfg, url, request, env);
    }

    // Check team availability (proxies to Backstage tenant API)
    if (request.method === 'GET' && path === '/api/github/check-team') {
      return handleCheckTeam(cfg, url, env, origin);
    }

    // Form submission
    if (request.method === 'POST' && path === '/api/submit') {
      return handleFormSubmit(cfg, request, env, origin);
    }

    // Contact form submission
    if (request.method === 'POST' && path === '/api/contact') {
      return handleContactForm(request, env, cfg, origin);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// ─── Rate Limiting (Cache API) ──────────────────────────────────────────────
// Simple per-IP rate limiter using Cloudflare Cache API.
// Not perfectly accurate (distributed, eventually consistent) but provides
// reasonable abuse protection without additional services (KV, D1).

async function checkRateLimit(ip, path, maxRequests, windowSec) {
  const cache = caches.default;
  const key = `https://rate-limit.internal/${path}/${ip}`;
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

function corsHeaders(cfg, origin = '') {
  const allowedOrigin = cfg.allowedOrigins.has(origin) ? origin : `https://${cfg.baseDomain}`;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(body, status = 200, extraHeaders = {}, cfg, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(cfg, origin), 'Content-Type': 'application/json', ...extraHeaders },
  });
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

function backstageAPI(cfg, path, token, options = {}) {
  return fetch(`${cfg.backstageAppUrl}${path}`, {
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

async function hmacSign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacVerify(data, signature, secret) {
  const expected = await hmacSign(data, secret);
  return expected === signature;
}

// ─── GitHub OAuth: Login ─────────────────────────────────────────────────────

async function handleGitHubLogin(cfg, env, url, origin) {
  const forMcp = url && url.searchParams.get('for') === 'mcp';

  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const stateSig = await hmacSign(state, env.GITHUB_OAUTH_HMAC_KEY);

  const scope = 'read:user user:email';

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', cfg.callbackUrl);
  githubAuthUrl.searchParams.set('scope', scope);
  githubAuthUrl.searchParams.set('state', state);

  const headers = new Headers();
  headers.set('Location', githubAuthUrl.toString());
  headers.append('Set-Cookie', `__gh_state=${state}.${stateSig}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`);
  if (forMcp) {
    headers.append('Set-Cookie', `__gh_flow=mcp; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`);
  }

  return new Response(null, { status: 302, headers });
}

// ─── GitHub OAuth: Callback ──────────────────────────────────────────────────

async function handleGitHubCallback(cfg, url, request, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return redirectWithError(cfg, 'ACCESS_DENIED');
  if (!code || !state) return redirectWithError(cfg, 'MISSING_PARAMS');

  // Validate state from cookie
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const stateCookie = cookies['__gh_state'];
  if (!stateCookie) return redirectWithError(cfg, 'INVALID_STATE');

  const [cookieState, cookieSig] = stateCookie.split('.');
  if (cookieState !== state || !await hmacVerify(cookieState, cookieSig, env.GITHUB_OAUTH_HMAC_KEY)) {
    return redirectWithError(cfg, 'INVALID_STATE');
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
        redirect_uri: cfg.callbackUrl,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) return redirectWithError(cfg, 'TOKEN_EXCHANGE');
    accessToken = tokenData.access_token;
  } catch (e) {
    return redirectWithError(cfg, 'TOKEN_EXCHANGE');
  }

  // Fetch user profile and emails
  let user, emails;
  try {
    const [userRes, emailsRes] = await Promise.all([
      githubAPI('/user', accessToken),
      githubAPI('/user/emails', accessToken),
    ]);
    if (!userRes.ok || !emailsRes.ok) return redirectWithError(cfg, 'PROFILE_FETCH');
    user = await userRes.json();
    emails = await emailsRes.json();
  } catch (e) {
    return redirectWithError(cfg, 'PROFILE_FETCH');
  }

  const primaryEmail = emails.find(e => e.primary && e.verified);
  const email = primaryEmail ? primaryEmail.email : (user.email || '');

  const clearState = '__gh_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/';
  const clearFlow  = '__gh_flow=;  HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/';

  // ── MCP flow: redirect to /mcp with token in URL fragment ───────────────
  // Fragment is never sent to the server — token stays client-side only.
  if (cookies['__gh_flow'] === 'mcp') {
    const sig = await hmacSign(user.login, env.GITHUB_OAUTH_HMAC_KEY);
    const mcpPayload = {
      login:      user.login,
      name:       user.name || '',
      avatar_url: user.avatar_url || '',
      html_url:   user.html_url || '',
      token:      accessToken,
      sig,
    };
    const encoded = btoa(JSON.stringify(mcpPayload))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const headers = new Headers();
    headers.set('Location', `${cfg.landingUrl}/mcp/#auth=${encoded}`);
    headers.append('Set-Cookie', clearState);
    headers.append('Set-Cookie', clearFlow);
    return new Response(null, { status: 302, headers });
  }

  // ── Normal landing flow ──────────────────────────────────────────────────
  const sig = await hmacSign(user.login, env.GITHUB_OAUTH_HMAC_KEY);

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

  const headers = new Headers();
  headers.set('Location', `${cfg.landingUrl}/?auth=${encoded}#request-access`);
  headers.append('Set-Cookie', clearState);
  headers.append('Set-Cookie', clearFlow);
  return new Response(null, { status: 302, headers });
}

function redirectWithError(cfg, errorCode) {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${cfg.landingUrl}/?auth_error=${errorCode}#request-access`,
      'Set-Cookie': '__gh_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
  });
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

async function handleCheckTeam(cfg, url, env, origin) {
  const name = url.searchParams.get('name');
  if (!name) {
    return jsonResponse({ error: 'Missing team name' }, 400, {}, cfg, origin);
  }

  const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
  if (!teamNameRegex.test(name)) {
    return jsonResponse({ available: false, error: 'Invalid team name format' }, 400, {}, cfg, origin);
  }

  if (!env.BACKSTAGE_LANDING_TOKEN) {
    console.error('check-team: BACKSTAGE_LANDING_TOKEN is not set');
    return jsonResponse({ error: 'Server misconfiguration' }, 500, {}, cfg, origin);
  }

  try {
    const jwt = await createLandingJwt(env.BACKSTAGE_LANDING_TOKEN);
    const res = await backstageAPI(
      cfg,
      `/api/tenant-management/tenants/${encodeURIComponent(name)}`,
      jwt,
    );
    if (res.status === 404) {
      return jsonResponse({ available: true }, 200, {}, cfg, origin);
    }
    if (res.ok) {
      return jsonResponse({ available: false, message: 'Team name is already taken' }, 200, {}, cfg, origin);
    }
    const body = await res.text().catch(() => '');
    console.error(`check-team: Backstage returned ${res.status} for "${name}": ${body}`);
    return jsonResponse({ error: 'Failed to check team availability' }, 500, {}, cfg, origin);
  } catch (e) {
    console.error('check-team: unexpected error:', e?.message ?? e);
    return jsonResponse({ error: 'Failed to check team availability' }, 500, {}, cfg, origin);
  }
}

// ─── Form Submit ─────────────────────────────────────────────────────────────

async function handleFormSubmit(cfg, request, env, origin) {
  try {
    const data = await request.json();
    const { github_auth, team, usecase } = data;

    // ── Validate GitHub auth (HMAC signature) ───────────────────────────────
    if (!github_auth || !github_auth.login || !github_auth.sig) {
      return jsonResponse({ success: false, message: 'GitHub authentication required' }, 401, {}, cfg, origin);
    }

    const validSig = await hmacVerify(github_auth.login, github_auth.sig, env.GITHUB_OAUTH_HMAC_KEY);
    if (!validSig) {
      return jsonResponse({ success: false, message: 'Invalid authentication signature' }, 403, {}, cfg, origin);
    }

    const { login, name, email, html_url } = github_auth;

    if (!team) {
      return jsonResponse({ success: false, message: 'Missing team name' }, 400, {}, cfg, origin);
    }

    const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
    if (!teamNameRegex.test(team)) {
      return jsonResponse({ success: false, message: 'Invalid team name format' }, 400, {}, cfg, origin);
    }

    // ── Check if tenant already exists ─────────────────────────────────────
    const jwt = await createLandingJwt(env.BACKSTAGE_LANDING_TOKEN);
    if (!cfg.unlimitedUsers.includes(login)) {
      try {
        const existsRes = await backstageAPI(
          cfg,
          `/api/tenant-management/tenants/${encodeURIComponent(team)}`,
          jwt,
        );
        if (existsRes.ok) {
          return jsonResponse({
            success: false,
            message: `Team "${team}" is already provisioned on the platform.`,
          }, 409, {}, cfg, origin);
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
        cfg,
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
        await sendWelcomeEmail(cfg, env, { email, name: name || login, team, login, workflowSubmitted });
      } catch (e) {
        console.error('Welcome email error:', e);
      }
    }

    // ── Response ─────────────────────────────────────────────────────────────
    if (workflowSubmitted) {
      return jsonResponse({
        success: true,
        message: `Team "${team}" is being provisioned! Sign in to ${cfg.backstageAppUrl} with your GitHub account — your workspace will be ready in ~2 minutes.`,
      }, 200, {}, cfg, origin);
    } else {
      return jsonResponse({
        success: false,
        message: `Failed to submit provisioning request: ${workflowError}`,
      }, 500, {}, cfg, origin);
    }

  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ success: false, message: 'Failed to submit request. Please try again.' }, 500, {}, cfg, origin);
  }
}

// ─── Contact Form ────────────────────────────────────────────────────────────

async function handleContactForm(request, env, cfg, origin) {
  try {
    const data = await request.json();
    const { name, email, message } = data;

    // Basic validation
    if (!name || !email || !message) {
      return jsonResponse({ success: false, message: 'All fields are required' }, 400, {}, cfg, origin);
    }

    if (!email.includes('@') || email.length < 5) {
      return jsonResponse({ success: false, message: 'Invalid email address' }, 400, {}, cfg, origin);
    }

    if (message.length < 10) {
      return jsonResponse({ success: false, message: 'Message is too short' }, 400, {}, cfg, origin);
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
      return jsonResponse({ success: false, message: 'Failed to send message. Please try again.' }, 500, {}, cfg, origin);
    }

    return jsonResponse({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
    }, 200, {}, cfg, origin);

  } catch (error) {
    console.error('Contact form error:', error);
    return jsonResponse({ success: false, message: 'Failed to send message. Please try again.' }, 500, {}, cfg, origin);
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

async function sendWelcomeEmail(cfg, env, { email, name, team, login, workflowSubmitted }) {
  const portalUrl = cfg.backstageAppUrl;
  const opsUrl = `https://ops.${cfg.baseDomain}/`;
  const contactUrl = `${cfg.landingUrl}/#contact`;

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
                    <a href="${portalUrl}" style="display:inline-block;padding:10px 20px;border:1px solid #00f5ff;color:#00f5ff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px">
                      Portal — app.${escHtml(cfg.baseDomain)}
                    </a>
                  </td>
                  <td>
                    <a href="${opsUrl}" style="display:inline-block;padding:10px 20px;border:1px solid #00f5ff;color:#00f5ff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px">
                      ArgoCD — ops.${escHtml(cfg.baseDomain)}
                    </a>
                  </td>
                </tr></table>
              </td>
            </tr>
          </table>

          <div style="border-top:1px solid rgba(0,245,255,0.1);padding-top:20px">
            <p style="color:#8b949e;font-size:13px;margin:0;line-height:1.5">
              Questions? Reply to this email or reach us at
              <a href="${contactUrl}" style="color:#00f5ff;text-decoration:none">${escHtml(cfg.baseDomain)}/contact</a>
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(0,245,255,0.1)">
          <p style="color:#484f58;font-size:12px;margin:0">&copy; 2025 MCTL. All rights reserved.</p>
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
