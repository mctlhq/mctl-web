/**
 * Cloudflare Worker for mctl.me landing page
 * - GitHub OAuth (login + callback)
 * - Form submission with HMAC-verified GitHub identity → Telegram
 *
 * Environment variables (set via wrangler secret):
 * - TELEGRAM_BOT_TOKEN: Telegram bot token
 * - TELEGRAM_CHAT_ID: Telegram chat ID for notifications
 * - GITHUB_CLIENT_ID: GitHub OAuth App client ID
 * - GITHUB_CLIENT_SECRET: GitHub OAuth App client secret
 * - GITHUB_OAUTH_HMAC_KEY: random 32+ char string for signing
 */

const ALLOWED_ORIGIN = 'https://platform.mctl.me';
const LANDING_URL = 'https://platform.mctl.me';
const CALLBACK_URL = 'https://platform.mctl.me/api/github/callback';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // GitHub OAuth: initiate login
    if (request.method === 'GET' && path === '/api/github/login') {
      return handleGitHubLogin(env);
    }

    // GitHub OAuth: callback
    if (request.method === 'GET' && path === '/api/github/callback') {
      return handleGitHubCallback(url, request, env);
    }

    // Form submission
    if (request.method === 'POST' && path === '/api/submit') {
      return handleFormSubmit(request, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// ─── CORS ────────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json', ...extraHeaders },
  });
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
  // Generate random state for CSRF protection
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Sign state for verification in callback
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

  // User denied access
  if (error) {
    return redirectWithError('ACCESS_DENIED');
  }

  if (!code || !state) {
    return redirectWithError('MISSING_PARAMS');
  }

  // Validate state from cookie
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const stateCookie = cookies['__gh_state'];

  if (!stateCookie) {
    return redirectWithError('INVALID_STATE');
  }

  const [cookieState, cookieSig] = stateCookie.split('.');
  if (cookieState !== state || !await hmacVerify(cookieState, cookieSig, env.GITHUB_OAUTH_HMAC_KEY)) {
    return redirectWithError('INVALID_STATE');
  }

  // Exchange code for access token
  let accessToken;
  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: CALLBACK_URL,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error);
      return redirectWithError('TOKEN_EXCHANGE');
    }
    accessToken = tokenData.access_token;
  } catch (e) {
    console.error('Token exchange failed:', e);
    return redirectWithError('TOKEN_EXCHANGE');
  }

  // Fetch GitHub user profile and emails
  let user, emails;
  try {
    const [userRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'mctl-landing' },
      }),
      fetch('https://api.github.com/user/emails', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'mctl-landing' },
      }),
    ]);
    if (!userRes.ok || !emailsRes.ok) {
      return redirectWithError('PROFILE_FETCH');
    }
    user = await userRes.json();
    emails = await emailsRes.json();
  } catch (e) {
    console.error('Profile fetch failed:', e);
    return redirectWithError('PROFILE_FETCH');
  }

  // Find verified primary email
  const primaryEmail = emails.find(e => e.primary && e.verified);
  const email = primaryEmail ? primaryEmail.email : (user.email || '');

  // Sign login for verification on form submit
  const sig = await hmacSign(user.login, env.GITHUB_OAUTH_HMAC_KEY);

  // Build user data payload
  const userData = {
    login: user.login,
    name: user.name || '',
    email,
    avatar_url: user.avatar_url || '',
    html_url: user.html_url || '',
    sig,
  };

  // Base64url encode
  const encoded = btoa(JSON.stringify(userData))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // Redirect back to landing page with auth data in hash
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${LANDING_URL}/#auth=${encoded}`,
      // Clear state cookie
      'Set-Cookie': '__gh_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
  });
}

function redirectWithError(errorCode) {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${LANDING_URL}/#auth_error=${errorCode}`,
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

// ─── Form Submit ─────────────────────────────────────────────────────────────

async function handleFormSubmit(request, env) {
  try {
    const data = await request.json();
    const { github_auth, team, usecase } = data;

    // Validate GitHub auth data
    if (!github_auth || !github_auth.login || !github_auth.sig) {
      return jsonResponse({ success: false, message: 'GitHub authentication required' }, 401);
    }

    // Verify HMAC signature
    const validSig = await hmacVerify(github_auth.login, github_auth.sig, env.GITHUB_OAUTH_HMAC_KEY);
    if (!validSig) {
      return jsonResponse({ success: false, message: 'Invalid authentication signature' }, 403);
    }

    const { login, name, email, avatar_url, html_url } = github_auth;

    // Validate required fields
    if (!name || !email || !team) {
      return jsonResponse({ success: false, message: 'Missing required fields' }, 400);
    }

    // Validate team name
    const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
    if (!teamNameRegex.test(team)) {
      return jsonResponse({ success: false, message: 'Invalid team name format. Use lowercase alphanumeric with hyphens (max 63 chars).' }, 400);
    }

    // Build Telegram message
    const message = `
🚀 *New mctl\\.me Access Request*

🐙 *GitHub:* [@${escapeMarkdown(login)}](${escapeMarkdown(html_url)}) \\(verified via OAuth\\)
👤 *Name:* ${escapeMarkdown(name)}
📧 *Email:* ${escapeMarkdown(email)}
🏷 *Team:* \`${escapeMarkdown(team)}\`
📝 *Use Case:* ${escapeMarkdown(usecase || 'Not specified')}

⏰ *Submitted:* ${new Date().toISOString()}

\\-\\-\\-

*Next Steps:*
\`\`\`bash
# 1. Create GitHub team
gh api /orgs/dmitriimashkov/teams \\
  -f name=${team} \\
  -f privacy=secret

# 2. Invite user
gh api /orgs/dmitriimashkov/teams/${team}/memberships/${login} \\
  -X PUT -f role=member

# 3. Trigger RBAC sync
gh workflow run sync-argocd-teams.yml
\`\`\`

✅ User will get:
• Namespace: \`${team}\`
• ArgoCD access: \`preview\\-${team}\\-*\`
• Backstage login via GitHub OAuth
    `.trim();

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
      }),
    });

    if (!telegramResponse.ok) {
      const error = await telegramResponse.text();
      console.error('Telegram API error:', error);
      throw new Error('Failed to send Telegram message');
    }

    return jsonResponse({
      success: true,
      message: 'Request submitted! You will be contacted soon.',
    });

  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ success: false, message: 'Failed to submit request. Please try again.' }, 500);
  }
}

// ─── Telegram Markdown V2 escaping ──────────────────────────────────────────

function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
