/**
 * Cloudflare Worker for mctl.me landing page
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
 * - BACKSTAGE_API_TOKEN: Shared secret for signing landing-page JWT tokens (HMAC-SHA256).
 *     Also used as static bearer fallback (BACKSTAGE_LANDING_TOKEN).
 * - RESEND_API_KEY: Resend.com API key for sending welcome emails
 */

const BASE_DOMAIN = 'mctl.me';
const ALLOWED_ORIGIN = `https://${BASE_DOMAIN}`;
const LANDING_URL = `https://${BASE_DOMAIN}`;
const CALLBACK_URL = `https://${BASE_DOMAIN}/api/github/callback`;
const GITHUB_ORG = 'mctlhq';
const BACKSTAGE_APP_URL = 'https://app.mctl.me';
const UNLIMITED_USERS = ['mashkovd'];

// Rate limit: max requests per IP per window (seconds)
const RATE_LIMITS = {
  '/api/submit':  { max: 5,  windowSec: 300 },  // 5 per 5 min
  '/api/contact': { max: 3,  windowSec: 300 },  // 3 per 5 min
  '/api/github/login': { max: 10, windowSec: 60 }, // 10 per min
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
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
        );
      }
    }

    // GitHub OAuth: initiate login
    if (request.method === 'GET' && path === '/api/github/login') {
      return handleGitHubLogin(env);
    }

    // GitHub OAuth: callback
    if (request.method === 'GET' && path === '/api/github/callback') {
      return handleGitHubCallback(url, request, env);
    }

    // Check team availability (proxies to Backstage tenant API)
    if (request.method === 'GET' && path === '/api/github/check-team') {
      return handleCheckTeam(url, env);
    }

    // Form submission
    if (request.method === 'POST' && path === '/api/submit') {
      return handleFormSubmit(request, env);
    }

    // Contact form submission
    if (request.method === 'POST' && path === '/api/contact') {
      return handleContactForm(request, env);
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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json', ...extraHeaders },
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

async function handleGitHubLogin(env) {
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const stateSig = await hmacSign(state, env.GITHUB_OAUTH_HMAC_KEY);

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  githubAuthUrl.searchParams.set('scope', 'read:user user:email');
  githubAuthUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': githubAuthUrl.toString(),
      'Set-Cookie': `__gh_state=${state}.${stateSig}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`,
    },
  });
}

// ─── GitHub OAuth: Callback ──────────────────────────────────────────────────

async function handleGitHubCallback(url, request, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return redirectWithError('ACCESS_DENIED');
  if (!code || !state) return redirectWithError('MISSING_PARAMS');

  // Validate state from cookie
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const stateCookie = cookies['__gh_state'];
  if (!stateCookie) return redirectWithError('INVALID_STATE');

  const [cookieState, cookieSig] = stateCookie.split('.');
  if (cookieState !== state || !await hmacVerify(cookieState, cookieSig, env.GITHUB_OAUTH_HMAC_KEY)) {
    return redirectWithError('INVALID_STATE');
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
    if (tokenData.error) return redirectWithError('TOKEN_EXCHANGE');
    accessToken = tokenData.access_token;
  } catch (e) {
    return redirectWithError('TOKEN_EXCHANGE');
  }

  // Fetch user profile and emails
  let user, emails;
  try {
    const [userRes, emailsRes] = await Promise.all([
      githubAPI('/user', accessToken),
      githubAPI('/user/emails', accessToken),
    ]);
    if (!userRes.ok || !emailsRes.ok) return redirectWithError('PROFILE_FETCH');
    user = await userRes.json();
    emails = await emailsRes.json();
  } catch (e) {
    return redirectWithError('PROFILE_FETCH');
  }

  const primaryEmail = emails.find(e => e.primary && e.verified);
  const email = primaryEmail ? primaryEmail.email : (user.email || '');
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

  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${LANDING_URL}/?auth=${encoded}#request-access`,
      'Set-Cookie': '__gh_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
  });
}

function redirectWithError(errorCode) {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${LANDING_URL}/?auth_error=${errorCode}#request-access`,
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

async function handleCheckTeam(url, env) {
  const name = url.searchParams.get('name');
  if (!name) {
    return jsonResponse({ error: 'Missing team name' }, 400);
  }

  const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
  if (!teamNameRegex.test(name)) {
    return jsonResponse({ available: false, error: 'Invalid team name format' }, 400);
  }

  try {
    const jwt = await createLandingJwt(env.BACKSTAGE_API_TOKEN);
    const res = await backstageAPI(
      `/api/tenant-management/tenants/${encodeURIComponent(name)}`,
      jwt,
    );
    if (res.status === 404) {
      return jsonResponse({ available: true });
    }
    if (res.ok) {
      return jsonResponse({ available: false, message: 'Team name is already taken' });
    }
    return jsonResponse({ error: 'Failed to check team availability' }, 500);
  } catch (e) {
    console.error('Check team error:', e);
    return jsonResponse({ error: 'Failed to check team availability' }, 500);
  }
}

// ─── Form Submit ─────────────────────────────────────────────────────────────

async function handleFormSubmit(request, env) {
  try {
    const data = await request.json();
    const { github_auth, team, usecase } = data;

    // ── Validate GitHub auth (HMAC signature) ───────────────────────────────
    if (!github_auth || !github_auth.login || !github_auth.sig) {
      return jsonResponse({ success: false, message: 'GitHub authentication required' }, 401);
    }

    const validSig = await hmacVerify(github_auth.login, github_auth.sig, env.GITHUB_OAUTH_HMAC_KEY);
    if (!validSig) {
      return jsonResponse({ success: false, message: 'Invalid authentication signature' }, 403);
    }

    const { login, name, email, html_url } = github_auth;

    if (!team) {
      return jsonResponse({ success: false, message: 'Missing team name' }, 400);
    }

    const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
    if (!teamNameRegex.test(team)) {
      return jsonResponse({ success: false, message: 'Invalid team name format' }, 400);
    }

    // ── Check if tenant already exists ─────────────────────────────────────
    const jwt = await createLandingJwt(env.BACKSTAGE_API_TOKEN);
    if (!UNLIMITED_USERS.includes(login)) {
      try {
        const existsRes = await backstageAPI(
          `/api/tenant-management/tenants/${encodeURIComponent(team)}`,
          jwt,
        );
        if (existsRes.ok) {
          return jsonResponse({
            success: false,
            message: `Team "${team}" is already provisioned on the platform.`,
          }, 409);
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
        message: `Team "${team}" is being provisioned! Sign in to app.mctl.me with your GitHub account — your workspace will be ready in ~2 minutes.`,
      });
    } else {
      return jsonResponse({
        success: false,
        message: `Failed to submit provisioning request: ${workflowError}`,
      }, 500);
    }

  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ success: false, message: 'Failed to submit request. Please try again.' }, 500);
  }
}

// ─── Contact Form ────────────────────────────────────────────────────────────

async function handleContactForm(request, env) {
  try {
    const data = await request.json();
    const { name, email, message } = data;

    // Basic validation
    if (!name || !email || !message) {
      return jsonResponse({ success: false, message: 'All fields are required' }, 400);
    }

    if (!email.includes('@') || email.length < 5) {
      return jsonResponse({ success: false, message: 'Invalid email address' }, 400);
    }

    if (message.length < 10) {
      return jsonResponse({ success: false, message: 'Message is too short' }, 400);
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
      return jsonResponse({ success: false, message: 'Failed to send message. Please try again.' }, 500);
    }

    return jsonResponse({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return jsonResponse({ success: false, message: 'Failed to send message. Please try again.' }, 500);
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
                    <a href="https://app.mctl.me/" style="display:inline-block;padding:10px 20px;border:1px solid #00f5ff;color:#00f5ff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px">
                      Portal — app.mctl.me
                    </a>
                  </td>
                  <td>
                    <a href="https://ops.mctl.me/" style="display:inline-block;padding:10px 20px;border:1px solid #00f5ff;color:#00f5ff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px">
                      ArgoCD — ops.mctl.me
                    </a>
                  </td>
                </tr></table>
              </td>
            </tr>
          </table>

          <div style="border-top:1px solid rgba(0,245,255,0.1);padding-top:20px">
            <p style="color:#8b949e;font-size:13px;margin:0;line-height:1.5">
              Questions? Reply to this email or reach us at
              <a href="https://mctl.me/#contact" style="color:#00f5ff;text-decoration:none">mctl.me/contact</a>
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
      from: 'MCTL <noreply@mctl.me>',
      to: [email],
      subject: `Your team "${team}" is being provisioned — sign in to get started`,
      html,
    }),
  });
}
